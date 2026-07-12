const https = require('https');
const fs = require('fs');
const secrets = JSON.parse(fs.readFileSync('secrets.local.json', 'utf8'));

function d1Query(dbId, sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql });
    const opts = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${secrets.CLOUDFLARE_ACCOUNT_ID}/d1/database/${dbId}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secrets.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 30000
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.success) resolve(j.result);
          else reject(new Error(JSON.stringify(j.errors)));
        } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const PREVIEW_DB = '8ac6d05f-1638-41b0-ac81-83238abad191';
const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('=== Checking Preview D1 State ===\n');

  // Check _migrations
  const migrations = await d1Query(PREVIEW_DB, 'SELECT * FROM _migrations');
  console.log('_migrations table entries:');
  migrations[0].results.forEach(r => console.log(`  - ${r.id} (${r.applied_at})`));

  await delay(300);

  // Check schema.sql vs live DB - check key columns that migrations v003-v006 create
  console.log('\n--- Checking critical columns ---');

  // Check Lessons.recording_url vs audio_url
  const lessonsCols = await d1Query(PREVIEW_DB, "PRAGMA table_info(Lessons)");
  const lessonColNames = lessonsCols[0].results.map(c => c.name);
  console.log(`Lessons has recording_url: ${lessonColNames.includes('recording_url')}`);
  console.log(`Lessons has audio_url: ${lessonColNames.includes('audio_url')}`);
  console.log(`Lessons has exam_id: ${lessonColNames.includes('exam_id')}`);

  await delay(300);

  // Check CreditWallets columns
  const walletCols = await d1Query(PREVIEW_DB, "PRAGMA table_info(CreditWallets)");
  const walletColNames = walletCols[0].results.map(c => c.name);
  console.log(`CreditWallets has balance: ${walletColNames.includes('balance')}`);
   console.log(`CreditWallets has balance_rupees: ${walletColNames.includes('balance_rupees')}`);
  console.log(`CreditWallets has ai_balance: ${walletColNames.includes('ai_balance')}`);

  await delay(300);

  // Check Courses columns
  const coursesCols = await d1Query(PREVIEW_DB, "PRAGMA table_info(Courses)");
  const coursesColNames = coursesCols[0].results.map(c => c.name);
  console.log(`Courses has wallet_rupees: ${coursesColNames.includes('wallet_rupees')}`);
  console.log(`Courses has sequential_unlock: ${coursesColNames.includes('sequential_unlock')}`);
  console.log(`Courses has self_study_credit_cost: ${coursesColNames.includes('self_study_credit_cost')}`);

  await delay(300);

  // Check LiveSessions constraints
  const liveSQL = await d1Query(PREVIEW_DB, "SELECT sql FROM sqlite_master WHERE type='table' AND name='LiveSessions'");
  console.log(`\nLiveSessions CREATE SQL: ${liveSQL[0].results[0]?.sql}`);

  await delay(300);

  // Check PushSubscriptions user_id nullability
  const pushCols = await d1Query(PREVIEW_DB, "PRAGMA table_info(PushSubscriptions)");
  const userIdCol = pushCols[0].results.find(c => c.name === 'user_id');
  console.log(`PushSubscriptions.user_id notnull: ${userIdCol?.notnull}`);

  await delay(300);

  // Check Batches columns
  const batchesCols = await d1Query(PREVIEW_DB, "PRAGMA table_info(Batches)");
  const batchesColNames = batchesCols[0].results.map(c => c.name);
  console.log(`Batches has cost_per_class_rupees: ${batchesColNames.includes('cost_per_class_rupees')}`);
  console.log(`Batches has cost_per_class_inr (old): ${batchesColNames.includes('cost_per_class_inr')}`);
  console.log(`Batches has live_class_credit_cost: ${batchesColNames.includes('live_class_credit_cost')}`);
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
