require('dotenv').config({ path: '.env' });
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const Anthropic = require('@anthropic-ai/sdk');

const META_TOKEN = process.env.META_ACCESS_TOKEN;
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Terminal colors ───────────────────────────────────────
const c = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgBlue:  '\x1b[44m',
};

// ─── UI Helpers ────────────────────────────────────────────
function divider() {
  console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`);
}

function header() {
  console.clear();
  console.log('');
  console.log(`${c.cyan}${c.bright}  ░█████╗░██████╗░██████╗░██╗░░░░░░█████╗░██╗███╗░░██╗${c.reset}`);
  console.log(`${c.cyan}  ██╔══██╗██╔══██╗██╔══██╗██║░░░░░██╔══██╗██║████╗░██║${c.reset}`);
  console.log(`${c.cyan}  ███████║██║░░██║██████╔╝██║░░░░░███████║██║██╔██╗██║${c.reset}`);
  console.log(`${c.cyan}  ██╔══██║██║░░██║██╔═══╝░██║░░░░░██╔══██║██║██║╚████║${c.reset}`);
  console.log(`${c.cyan}${c.bright}  ██║░░██║██████╔╝██║░░░░░███████╗██║░░██║██║░╚███║${c.reset}`);
  console.log(`${c.cyan}  ╚═╝░░╚═╝╚═════╝░╚═╝░░░░░╚══════╝╚═╝░░╚═╝╚═╝╚═╝░░╚══╝${c.reset}`);
  console.log('');
  console.log(`${c.dim}  Your ads. Explained in plain English.${c.reset}`);
  console.log('');
}

function accountHeader(name, id, spent) {
  console.log('');
  console.log(`${c.bgBlue}${c.white}${c.bright}  📊 ${name.toUpperCase()}  ${c.reset}`);
  console.log(`${c.dim}  Account: ${id}${c.reset}`);
  console.log(`${c.dim}  Total spent to date: $${spent}${c.reset}`);
  console.log('');
}

// ─── Smart ad scorer ──────────────────────────────────────
function scoreAd(ad) {
  const ctr   = parseFloat(ad.ctr   || 0);
  const cpc   = parseFloat(ad.cpc   || 0);
  const spend = parseFloat(ad.spend || 0);

  // Count real results only — leads, purchases, contacts
  let results = 0;
  if (ad.actions) {
    ad.actions.forEach(a => {
      if (['lead', 'purchase', 'contact',
           'onsite_conversion.lead_grouped'].includes(a.action_type)) {
        results += parseFloat(a.value || 0);
      }
    });
  }

  // PAUSE: spent real money and got almost nothing back
  if (spend > 30 && results < 2) {
    return { label: '● PAUSE', color: c.red };
  }

  // PAUSE: clicks too expensive or nobody clicking
  if (ctr < 0.5 || cpc > 3) {
    return { label: '● PAUSE', color: c.red };
  }

  // WINNER: strong clicks, cheap cost, real results
  if (ctr >= 2 && cpc <= 1.5 && results >= 2) {
    return { label: '● WINNER', color: c.green };
  }

  // WINNER: exceptional CTR and very cheap clicks
  if (ctr >= 3 && cpc <= 0.50) {
    return { label: '● WINNER', color: c.green };
  }

  // Everything else needs more data
  return { label: '● WATCH', color: c.yellow };
}

function adRow(ad, index) {
  const spend  = parseFloat(ad.spend     || 0).toFixed(2);
  const ctr    = parseFloat(ad.ctr       || 0).toFixed(2);
  const cpc    = parseFloat(ad.cpc       || 0).toFixed(2);
  const clicks = ad.clicks               || 0;
  const impr   = parseInt(ad.impressions || 0).toLocaleString();
  const score  = scoreAd(ad);

  console.log(`  ${c.bright}${index + 1}. ${ad.ad_name}${c.reset}`);
  console.log(`     ${score.color}${c.bright}${score.label}${c.reset}`);
  console.log(
    `     Spend: ${c.bright}$${spend}${c.reset}` +
    `  Reach: ${c.bright}${impr}${c.reset}` +
    `  Clicks: ${c.bright}${clicks}${c.reset}` +
    `  CTR: ${c.bright}${ctr}%${c.reset}` +
    `  CPC: ${c.bright}$${cpc}${c.reset}`
  );

  // Show meaningful conversions
  if (ad.actions && ad.actions.length > 0) {
    const relevant = ad.actions.filter(a =>
      ['lead', 'purchase', 'contact',
       'onsite_conversion.messaging_conversation_started_7d',
       'onsite_conversion.lead_grouped'].includes(a.action_type)
    );
    relevant.forEach(r => {
      const label =
        r.action_type === 'lead'     ? '🎯 Leads'     :
        r.action_type === 'purchase' ? '💰 Purchases' :
        r.action_type === 'contact'  ? '📞 Contacts'  :
        '💬 Messages started';
      console.log(`     ${c.green}${label}: ${c.bright}${r.value}${c.reset}`);
    });
  }

  // Cost per result
  if (ad.cost_per_action_type && ad.cost_per_action_type.length > 0) {
    const cpr = ad.cost_per_action_type.find(a =>
      ['lead', 'purchase', 'contact'].includes(a.action_type)
    );
    if (cpr) {
      console.log(
        `     ${c.dim}Cost per result: $${parseFloat(cpr.value).toFixed(2)}${c.reset}`
      );
    }
  }

  console.log('');
}

function printSummary(summary) {
  const sections = summary.split(/(?=🟢|🔴|💡)/);

  sections.forEach(section => {
    const trimmed = section.trim();
    if (!trimmed) return;

    let headerColor = c.white;
    if (trimmed.startsWith('🟢')) headerColor = c.green;
    if (trimmed.startsWith('🔴')) headerColor = c.red;
    if (trimmed.startsWith('💡')) headerColor = c.yellow;

    const lines = trimmed.split('\n');
    lines.forEach((line, i) => {
      const clean = line.replace(/\*\*/g, '');
      if (i === 0) {
        console.log(`  ${headerColor}${c.bright}${clean}${c.reset}`);
      } else if (clean.trim().match(/^\d+\./)) {
        console.log(`  ${c.bright}${clean}${c.reset}`);
      } else {
        const words = clean.split(' ');
        let currentLine = '  ';
        words.forEach(word => {
          if ((currentLine + word).length > 60) {
            console.log(`${c.dim}${currentLine}${c.reset}`);
            currentLine = '    ' + word + ' ';
          } else {
            currentLine += word + ' ';
          }
        });
        if (currentLine.trim()) {
          console.log(`${c.dim}${currentLine}${c.reset}`);
        }
      }
    });
    console.log('');
  });
}

// ─── Meta API ─────────────────────────────────────────────
async function getAllAccounts() {
  const url =
    `https://graph.facebook.com/v19.0/me/adaccounts` +
    `?fields=name,account_id,account_status,amount_spent` +
    `&access_token=${META_TOKEN}`;

  const res  = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.error('Meta API error:', data.error.message);
    return null;
  }

  return data.data.filter(a => a.account_status === 1);
}

async function getAdData(accountId) {
  const fields = [
    'ad_name', 'adset_name', 'campaign_name',
    'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
    'spend', 'actions', 'cost_per_action_type',
    'reach', 'frequency'
  ].join(',');

  const url =
    `https://graph.facebook.com/v19.0/${accountId}/insights` +
    `?fields=${fields}` +
    `&level=ad` +
    `&date_preset=last_7d` +
    `&access_token=${META_TOKEN}`;

  const res  = await fetch(url);
  const data = await res.json();

  if (data.error || !data.data || data.data.length === 0) return null;
  return data.data;
}

// ─── Claude AI ────────────────────────────────────────────
async function generateSummary(adData, accountName) {
  const message = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are AdPlain. You explain Facebook ad performance to small business owners in plain English. No jargon, no marketing speak. Write like a knowledgeable friend who genuinely cares about their business and their money.

Ad data for ${accountName} — last 7 days:
${JSON.stringify(adData, null, 2)}

Write exactly 3 sections using these exact emoji headers:

🟢 WHAT'S WORKING
Explain what is performing well and WHY it is working. Reference the specific ad name, the CTR, cost per result, and what those numbers mean in plain English — for example "a 5% CTR means 1 in 20 people who saw it actually clicked, which is really strong." Tell them what about this ad is likely resonating — is it the offer, the visual, the audience? Give them the specific dollar math showing return on their spend. End with one concrete sentence on how much to increase the daily budget and why now is the right time.

🔴 WHAT TO STOP
Name every specific ad that is wasting money. For each one give the exact spend, the cost per result, and directly compare it to the winning ad so they feel the difference — for example "you paid $3.31 per click on this vs $0.15 on your winner — that is 22 times more expensive." Tell them to pause it today. Calculate the exact dollar amount they will save per week by pausing it and state clearly where that money should go instead.

💡 EXACT NEXT STEPS
Give them 3 numbered steps they can complete in the next 24 hours. Be surgical — name the actual ad, the actual dollar amount, the exact action. Format exactly like this:
1. [2 min] What to do and exactly how to do it
2. [5 min] What to do and exactly how to do it
3. [This week] What to watch for and what it means if you see it

Rules:
- Use real numbers from the data in every single sentence
- Never use: optimize, leverage, synergy, robust, holistic, streamline, utilize
- If there are purchases mention them and what that likely means for revenue
- Always compare costs directly between ads so the difference is obvious
- Write in second person — you, your
- If an ad has zero leads and zero purchases say so bluntly
- When an ad has strong CTR but no conversions explain that people are clicking but not booking and suggest why`
    }]
  });

  return message.content[0].text;
}

// ─── Main ──────────────────────────────────────────────────
async function main() {
  if (!META_TOKEN || !process.env.ANTHROPIC_API_KEY) {
    console.error('Missing environment variables. Check your .env file.');
    process.exit(1);
  }

  header();

  const now = new Date();
  console.log(
    `${c.dim}  Analysis started · ` +
    `${now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    })} · ` +
    `${now.toLocaleTimeString()}${c.reset}`
  );
  console.log('');
  divider();

  const accounts = await getAllAccounts();
  if (!accounts || accounts.length === 0) {
    console.error('\nNo active ad accounts found for this token.');
    return;
  }

  console.log(
    `${c.dim}  Found ${accounts.length} active ad account${accounts.length > 1 ? 's' : ''}. Analyzing all.${c.reset}`
  );

  for (const account of accounts) {
    const spent = account.amount_spent
      ? (parseInt(account.amount_spent) / 100).toFixed(2)
      : '0.00';

    accountHeader(account.name, account.id, spent);

    const adData = await getAdData(account.id);

    if (!adData) {
      console.log(
        `${c.dim}  No ads ran in the last 7 days for this account.${c.reset}\n`
      );
      divider();
      continue;
    }

    adData.forEach((ad, i) => adRow(ad, i));
    divider();

    process.stdout.write(`\n${c.dim}  Analyzing with AI...${c.reset}`);
    const summary = await generateSummary(adData, account.name);
    process.stdout.write('\r' + ' '.repeat(30) + '\r');

    console.log(
      `\n${c.cyan}${c.bright}  ✦ ADPLAIN SUMMARY — ${account.name.toUpperCase()}${c.reset}\n`
    );
    printSummary(summary);
    divider();
  }

  console.log('');
  console.log(
    `${c.green}${c.bright}  ✓ Done — ${accounts.length} account${accounts.length > 1 ? 's' : ''} analyzed${c.reset}`
  );
  console.log(
    `${c.dim}  In the real product this runs automatically every morning.${c.reset}`
  );
  console.log('');
}

main().catch(console.error);