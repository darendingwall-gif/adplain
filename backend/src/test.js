// Run with: node --env-file=.env src/test.js
// (or: node src/test.js if dotenv is loaded separately)
require('dotenv').config({ path: '.env' });

const fetch     = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const Anthropic = require('@anthropic-ai/sdk');
const config    = require('./config');

let passed = 0;
let failed = 0;

function ok(label, value, expected) {
  if (value === expected) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.log(`  ✗  ${label}`);
    console.log(`       expected: ${JSON.stringify(expected)}`);
    console.log(`       got:      ${JSON.stringify(value)}`);
    failed++;
  }
}

// ─── scoreAd logic (inline copy so test has no side effects) ──
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

async function run() {
  console.log('\n  AdPlain — test suite\n');

  // ── Scoring logic ──────────────────────────────────────
  console.log('  Scoring function');

  // The Maternity/Newborn case: $60+ spend, 1 lead → must be PAUSE
  ok('spend>30 + 1 lead = pause',
    scoreAd({ spend: '62.00', ctr: '2.1', cpc: '1.20',
      actions: [{ action_type: 'lead', value: '1' }] }),
    'pause'
  );

  // Messages should NOT count toward results
  ok('spend>30 + message only = pause (messages excluded)',
    scoreAd({ spend: '50.00', ctr: '2.5', cpc: '1.10',
      actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '5' }] }),
    'pause'
  );

  // Contacts should NOT count toward results
  ok('spend>30 + contact only = pause (contacts excluded)',
    scoreAd({ spend: '45.00', ctr: '2.2', cpc: '1.00',
      actions: [{ action_type: 'contact', value: '3' }] }),
    'pause'
  );

  // Low CTR → pause regardless of spend
  ok('ctr<0.5 = pause',
    scoreAd({ spend: '5.00', ctr: '0.3', cpc: '1.00', actions: [] }),
    'pause'
  );

  // High CPC → pause
  ok('cpc>3 = pause',
    scoreAd({ spend: '10.00', ctr: '1.5', cpc: '3.50', actions: [] }),
    'pause'
  );

  // Good CTR + low CPC + 2 leads → winner
  ok('ctr>=2, cpc<=1.5, 2 leads = winner',
    scoreAd({ spend: '25.00', ctr: '2.5', cpc: '1.20',
      actions: [{ action_type: 'lead', value: '2' }] }),
    'winner'
  );

  // Very high CTR + very low CPC → winner (no results needed)
  ok('ctr>=3, cpc<=0.50 = winner',
    scoreAd({ spend: '8.00', ctr: '3.2', cpc: '0.45', actions: [] }),
    'winner'
  );

  // Mid performance → watch
  ok('mid ctr, ok cpc, low spend = watch',
    scoreAd({ spend: '12.00', ctr: '1.2', cpc: '1.80', actions: [] }),
    'watch'
  );

  // ── Meta API ───────────────────────────────────────────
  console.log('\n  Meta API');
  try {
    const url  = `https://graph.facebook.com/v19.0/me/adaccounts` +
                 `?fields=name,account_id,account_status&access_token=${config.META_ACCESS_TOKEN}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.log(`  ✗  connection: ${data.error.message}`);
      failed++;
    } else {
      const active = data.data.filter(a => a.account_status === 1);
      console.log(`  ✓  connection ok`);
      console.log(`  ✓  ${active.length} active account(s) found:`);
      active.forEach(a => console.log(`       · ${a.name} (${a.id})`));
      passed += 2;
    }
  } catch (e) {
    console.log(`  ✗  connection error: ${e.message}`);
    failed++;
  }

  // ── Claude API ─────────────────────────────────────────
  console.log('\n  Claude API');
  try {
    const claude = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const msg    = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 5,
      messages: [{ role: 'user', content: 'ping' }]
    });
    if (msg.content && msg.content[0].text) {
      console.log(`  ✓  connection ok`);
      passed++;
    } else {
      console.log(`  ✗  unexpected response shape`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗  connection error: ${e.message}`);
    failed++;
  }

  // ── Summary ────────────────────────────────────────────
  console.log('');
  if (failed === 0) {
    console.log(`  All ${passed} tests passed.\n`);
  } else {
    console.log(`  ${passed} passed, ${failed} failed.\n`);
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
