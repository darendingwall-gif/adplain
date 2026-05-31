require('dotenv').config({ path: '.env' });
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const fetch     = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const Anthropic = require('@anthropic-ai/sdk');
const config    = require('./config');

const app    = express();
const claude = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

// ─── Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// API key guard — all /api routes except /api/health
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['x-api-key'];
  if (!key || key !== config.API_SECRET_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
});

// Request logger — timestamp, method, path, status, response time
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms  = Date.now() - start;
    const ts  = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    const col = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`  ${col}${res.statusCode}\x1b[0m  [${ts}] ${req.method} ${req.path} ${ms}ms`);
  });
  next();
});

// ─── In-memory cache ──────────────────────────────────────
// NOTE: Single-user dev mode — META_ACCESS_TOKEN is read from .env.
// In production each user will have their own token stored in the database,
// retrieved per-request from their authenticated session.
const analysisCache = new Map();
const CACHE_TTL_MS  = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  return entry;
}

function setCached(key, data) {
  analysisCache.set(key, { data, timestamp: Date.now() });
}

// ─── Smart ad scorer ──────────────────────────────────────
// PAUSE if spend > $30 and fewer than 2 real results.
// Real results = leads + purchases only.
// Messages and contacts are interest signals, not conversions — do not count them.
function scoreAd(ad) {
  const ctr   = parseFloat(ad.ctr   || 0);
  const cpc   = parseFloat(ad.cpc   || 0);
  const spend = parseFloat(ad.spend || 0);

  let results = 0;
  if (ad.actions) {
    ad.actions.forEach(a => {
      if (['lead', 'purchase', 'onsite_conversion.lead_grouped'].includes(a.action_type)) {
        results += parseFloat(a.value || 0);
      }
    });
  }

  if (spend > 30 && results < 2)                 return 'pause';
  if (ctr < 0.5  || cpc > 3)                    return 'pause';
  if (ctr >= 2   && cpc <= 1.5 && results >= 2) return 'winner';
  if (ctr >= 3   && cpc <= 0.50)                return 'winner';
  return 'watch';
}

// ─── Meta API helpers ─────────────────────────────────────
async function getAccounts(token) {
  const url  = `https://graph.facebook.com/v19.0/me/adaccounts` +
               `?fields=name,account_id,account_status,amount_spent&access_token=${token}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data.filter(a => a.account_status === 1);
}

async function getAdData(accountId, token, dateRange = 'last_7d') {
  const fields = [
    'ad_name', 'adset_name', 'campaign_name',
    'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
    'spend', 'actions', 'cost_per_action_type',
    'reach', 'frequency'
  ].join(',');

  const url  = `https://graph.facebook.com/v19.0/${accountId}/insights` +
               `?fields=${fields}&level=ad&date_preset=${dateRange}&access_token=${token}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

// ─── Claude AI ────────────────────────────────────────────
async function generateSummary(adData, accountName) {
  const message = await claude.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role:    'user',
      content: `You are AdPlain. You explain Facebook ad performance to small business owners in plain English. No jargon, no marketing speak. Write like a knowledgeable friend who genuinely cares about their business and their money.

Ad data for ${accountName}:
${JSON.stringify(adData, null, 2)}

Write exactly 3 sections using these exact emoji headers:

🟢 WHAT'S WORKING
Explain what is performing well and WHY it is working. Reference the specific ad name, the CTR, cost per result, and what those numbers mean in plain English. Tell them what about this ad is likely resonating. Give them the specific dollar math. End with one concrete sentence on how much to increase the daily budget and why now is the right time.

🔴 WHAT TO STOP
Name every specific ad wasting money. Give exact spend, cost per result, and compare directly to the winner. Tell them to pause it today. Calculate exactly how much they save per week and where that money should go.

💡 EXACT NEXT STEPS
3 numbered steps completable in 24 hours:
1. [2 min] Exact action with exact ad name
2. [5 min] Exact action with exact dollar amount
3. [This week] What to watch and what it means

Rules:
- Real numbers in every sentence
- Never use: optimize, leverage, synergy, robust, holistic, streamline
- Compare costs directly between ads
- Write in second person
- If zero leads and zero purchases say so bluntly
- Write plain text only — no markdown formatting, no ## headers, no --- separators, no ** bold markers`
    }]
  });

  return message.content[0].text;
}

// ─── Process raw ad data → scored ad objects ───────────────
function processAds(rawAds) {
  const ads = rawAds.map(ad => {
    const conversions = [];
    if (ad.actions) {
      ad.actions.forEach(a => {
        if (['lead', 'purchase', 'contact',
             'onsite_conversion.messaging_conversation_started_7d',
             'onsite_conversion.lead_grouped'].includes(a.action_type)) {
          conversions.push({
            type:  a.action_type === 'lead'     ? 'Leads'
                 : a.action_type === 'purchase' ? 'Purchases'
                 : a.action_type === 'contact'  ? 'Contacts'
                 : 'Messages',
            value: a.value
          });
        }
      });
    }

    let costPerResult = null;
    if (ad.cost_per_action_type) {
      const cpr = ad.cost_per_action_type.find(a =>
        ['lead', 'purchase', 'contact'].includes(a.action_type)
      );
      if (cpr) costPerResult = parseFloat(cpr.value).toFixed(2);
    }

    return {
      id:          ad.ad_id || ad.ad_name,
      name:        ad.ad_name,
      campaign:    ad.campaign_name,
      adset:       ad.adset_name,
      spend:       parseFloat(ad.spend       || 0).toFixed(2),
      impressions: parseInt(ad.impressions   || 0),
      reach:       parseInt(ad.reach         || 0),
      clicks:      parseInt(ad.clicks        || 0),
      ctr:         parseFloat(ad.ctr         || 0).toFixed(2),
      cpc:         parseFloat(ad.cpc         || 0).toFixed(2),
      cpm:         parseFloat(ad.cpm         || 0).toFixed(2),
      frequency:   parseFloat(ad.frequency   || 0).toFixed(2),
      score:       scoreAd(ad),
      conversions,
      costPerResult
    };
  });

  const order = { winner: 0, watch: 1, pause: 2 };
  return ads.sort((a, b) => order[a.score] - order[b.score]);
}

// ─── Validate dateRange param ──────────────────────────────
function parseDateRange(query) {
  const allowed = ['last_7d', 'last_14d', 'last_30d'];
  return allowed.includes(query) ? query : 'last_7d';
}

// ─── Routes ───────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', product: 'AdPlain', version: '0.2.0' });
});

// System status — uptime, cache, API connectivity
app.get('/api/status', async (req, res) => {
  const uptimeMin = Math.floor(process.uptime() / 60);

  const cacheEntries = [];
  for (const [key, entry] of analysisCache.entries()) {
    cacheEntries.push({
      key,
      ageMin:    Math.floor((Date.now() - entry.timestamp) / 60000),
      timestamp: new Date(entry.timestamp).toISOString()
    });
  }

  let metaStatus = 'ok';
  try {
    await getAccounts(config.META_ACCESS_TOKEN);
  } catch (e) {
    metaStatus = `error: ${e.message}`;
  }

  let claudeStatus = 'ok';
  try {
    await claude.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 5,
      messages: [{ role: 'user', content: 'ping' }]
    });
  } catch (e) {
    claudeStatus = `error: ${e.message}`;
  }

  res.json({
    success:    true,
    uptime:     { minutes: uptimeMin },
    cache:      { count: cacheEntries.length, entries: cacheEntries },
    metaApi:    metaStatus,
    claudeApi:  claudeStatus,
    serverTime: new Date().toISOString()
  });
});

app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await getAccounts(config.META_ACCESS_TOKEN);
    res.json({
      success:  true,
      count:    accounts.length,
      accounts: accounts.map(a => ({
        id:    a.id,
        name:  a.name,
        spent: a.amount_spent ? (parseInt(a.amount_spent) / 100).toFixed(2) : '0.00'
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Full analysis — all accounts, with cache + dateRange support
app.get('/api/analysis', async (req, res) => {
  try {
    const token     = config.META_ACCESS_TOKEN;
    const dateRange = parseDateRange(req.query.dateRange);
    const force     = req.query.force === 'true';

    const accounts = await getAccounts(token);
    const results  = [];

    for (const account of accounts) {
      const cacheKey = `${account.id}:${dateRange}`;

      if (!force) {
        const cached = getCached(cacheKey);
        if (cached) {
          const ageMin = Math.floor((Date.now() - cached.timestamp) / 60000);
          results.push({ ...cached.data, cache: true, cacheAge: ageMin });
          continue;
        }
      }

      const spent  = account.amount_spent
        ? (parseInt(account.amount_spent) / 100).toFixed(2) : '0.00';
      const rawAds = await getAdData(account.id, token, dateRange);

      if (!rawAds || rawAds.length === 0) {
        results.push({
          id: account.id, name: account.name, spent,
          ads: [], summary: null, status: 'no_ads', dateRange, cache: false
        });
        continue;
      }

      const ads     = processAds(rawAds);
      const summary = await generateSummary(rawAds, account.name);
      const result  = {
        id: account.id, name: account.name, spent, ads, summary,
        status: 'ok', dateRange, generatedAt: new Date().toISOString()
      };

      setCached(cacheKey, result);
      results.push({ ...result, cache: false });
    }

    res.json({ success: true, results });

  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single-account analysis
app.get('/api/analysis/:accountId', async (req, res) => {
  try {
    const token     = config.META_ACCESS_TOKEN;
    const accountId = req.params.accountId;
    const dateRange = parseDateRange(req.query.dateRange);
    const force     = req.query.force === 'true';
    const cacheKey  = `${accountId}:${dateRange}`;

    if (!force) {
      const cached = getCached(cacheKey);
      if (cached) {
        const ageMin = Math.floor((Date.now() - cached.timestamp) / 60000);
        return res.json({ success: true, ...cached.data, cache: true, cacheAge: ageMin });
      }
    }

    const rawAds = await getAdData(accountId, token, dateRange);
    if (!rawAds || rawAds.length === 0) {
      return res.json({ success: true, ads: [], summary: null, status: 'no_ads', dateRange, cache: false });
    }

    const ads     = processAds(rawAds);
    const summary = await generateSummary(rawAds, accountId);
    const result  = { ads, summary, status: 'ok', dateRange, generatedAt: new Date().toISOString() };

    setCached(cacheKey, result);
    res.json({ success: true, ...result, cache: false });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Force-refresh one account and update its cache entry
app.get('/api/refresh/:accountId', async (req, res) => {
  try {
    const token     = config.META_ACCESS_TOKEN;
    const accountId = req.params.accountId;
    const dateRange = parseDateRange(req.query.dateRange);

    const rawAds = await getAdData(accountId, token, dateRange);
    if (!rawAds || rawAds.length === 0) {
      return res.json({ success: true, ads: [], summary: null, status: 'no_ads', dateRange, cache: false });
    }

    const ads     = processAds(rawAds);
    const summary = await generateSummary(rawAds, accountId);
    const result  = { ads, summary, status: 'ok', dateRange, generatedAt: new Date().toISOString() };

    setCached(`${accountId}:${dateRange}`, result);
    res.json({ success: true, ...result, cache: false });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Start server ─────────────────────────────────────────
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log('');
  console.log(`  AdPlain API  →  http://localhost:${PORT}`);
  console.log('');
  console.log(`  GET /api/health              server ok`);
  console.log(`  GET /api/status              system status`);
  console.log(`  GET /api/accounts            list accounts`);
  console.log(`  GET /api/analysis            all accounts (dateRange, force)`);
  console.log(`  GET /api/analysis/:id        one account`);
  console.log(`  GET /api/refresh/:id         force-refresh one account`);
  console.log('');
});
