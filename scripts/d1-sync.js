const https = require('https');
const fs = require('fs');
const path = require('path');

const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secrets.local.json'), 'utf8'));
const ACCOUNT_ID = secrets.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = secrets.CLOUDFLARE_API_TOKEN;

const PROD_DB = 'f4ac10a4-7ace-4c38-a5cf-b956b1f028fe';
const PREVIEW_DB = '8ac6d05f-1638-41b0-ac81-83238abad191';

function d1Query(dbId, sql, retries = 3) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql });
    const opts = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${ACCOUNT_ID}/d1/database/${dbId}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
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
    req.on('error', async (err) => {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 2000));
        resolve(d1Query(dbId, sql, retries - 1));
      } else reject(err);
    });
    req.write(body);
    req.end();
  });
}

function d1Batch(dbId, statements, retries = 2) {
  return new Promise((resolve, reject) => {
    const batch = statements.map(sql => ({ sql }));
    const body = JSON.stringify({ batch });
    const opts = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${ACCOUNT_ID}/d1/database/${dbId}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 60000
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
    req.on('error', async (err) => {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 3000));
        resolve(d1Batch(dbId, statements, retries - 1));
      } else reject(err);
    });
    req.write(body);
    req.end();
  });
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function getTables(dbId) {
  const result = await d1Query(dbId, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('sqlite_sequence', '_cf_KV') ORDER BY name");
  return result[0].results.map(r => r.name);
}

async function getCreateSQL(dbId, tableName) {
  const result = await d1Query(dbId, `SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName.replace(/'/g, "''")}'`);
  return result[0].results[0]?.sql;
}

async function getRowCount(dbId, tableName) {
  const result = await d1Query(dbId, `SELECT COUNT(*) as cnt FROM "${tableName.replace(/"/g, '""')}"`);
  return result[0].results[0]?.cnt || 0;
}

async function exportTableData(dbId, tableName, offset, limit) {
  const result = await d1Query(dbId, `SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT ${limit} OFFSET ${offset}`);
  return result[0].results;
}

function getTopologicallySortedTables(createSQLs) {
  const tableDeps = {};
  for (const [name, sql] of Object.entries(createSQLs)) {
    const refs = [];
    const fkRegex = /REFERENCES\s+["']?(\w+)["']?\s*\(/gi;
    let m;
    while ((m = fkRegex.exec(sql)) !== null) {
      if (m[1].toLowerCase() !== name.toLowerCase()) refs.push(m[1]);
    }
    tableDeps[name] = refs;
  }
  const inDegree = {};
  const adj = {};
  for (const t of Object.keys(tableDeps)) { inDegree[t] = 0; adj[t] = []; }
  for (const [t, deps] of Object.entries(tableDeps)) {
    for (const d of deps) {
      if (adj[d]) adj[d].push(t);
      inDegree[t] = (inDegree[t] || 0) + 1;
    }
  }
  const queue = Object.keys(inDegree).filter(t => inDegree[t] === 0);
  const sorted = [];
  while (queue.length > 0) {
    const t = queue.shift();
    sorted.push(t);
    for (const n of (adj[t] || [])) { inDegree[n]--; if (inDegree[n] === 0) queue.push(n); }
  }
  for (const t of Object.keys(tableDeps)) { if (!sorted.includes(t)) sorted.push(t); }
  return sorted;
}

function formatValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof ArrayBuffer || v instanceof Uint8Array) {
    return "X'" + Buffer.from(v).toString('hex') + "'";
  }
  if (typeof v === 'object') {
    const s = JSON.stringify(v).replace(/'/g, "''");
    return "'" + s + "'";
  }
  const s = String(v).replace(/'/g, "''");
  return "'" + s + "'";
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('=== D1 Database Sync: Production -> Preview ===\n');

  console.log('Step 1: Reading production tables...');
  const prodTables = await getTables(PROD_DB);
  console.log(`  Found ${prodTables.length} tables\n`);
  await delay(500);

  console.log('Step 2: Getting table schemas...');
  const createSQLs = {};
  for (let i = 0; i < prodTables.length; i++) {
    const t = prodTables[i];
    const sql = await getCreateSQL(PROD_DB, t);
    if (sql) createSQLs[t] = sql;
    if (i % 10 === 0) process.stdout.write(`  ${i+1}/${prodTables.length}\r`);
    await delay(100);
  }
  console.log(`  Got schemas for ${Object.keys(createSQLs).length} tables\n`);

  console.log('Step 3: Sorting tables by FK dependencies...');
  const sorted = getTopologicallySortedTables(createSQLs);

  console.log('Step 4: Counting rows in production...');
  const rowCounts = {};
  for (const t of sorted) { rowCounts[t] = await getRowCount(PROD_DB, t); await delay(50); }
  const totalRows = Object.values(rowCounts).reduce((a, b) => a + b, 0);
  console.log(`  Total rows: ${totalRows}\n`);

  console.log('Step 5: Dropping all preview tables...');
  const previewTables = await getTables(PREVIEW_DB);
  await delay(500);
  if (previewTables.length > 0) {
    const dropChunks = chunk(previewTables, 20);
    for (const c of dropChunks) {
      const stmts = ['PRAGMA foreign_keys = OFF', ...c.map(t => `DROP TABLE IF EXISTS "${t.replace(/"/g, '""')}"`)];
      try {
        await d1Batch(PREVIEW_DB, stmts);
      } catch (e) {
        for (const t of c) {
          try { await d1Query(PREVIEW_DB, `DROP TABLE IF EXISTS "${t.replace(/"/g, '""')}"`); } catch (e2) {}
        }
      }
      await delay(200);
    }
    console.log(`  Dropped ${previewTables.length} tables\n`);
  } else {
    console.log('  No tables to drop\n');
  }

  console.log('Step 6: Creating tables and inserting data...');
  let processedTables = 0;
  let totalInserted = 0;

  for (const tableName of sorted) {
    const createSQL = createSQLs[tableName];
    const rowCount = rowCounts[tableName];

    let safeSQL = createSQL
      .replace(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+/i, '__KEEP__')
      .replace(/CREATE\s+TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ')
      .replace('__KEEP__', 'CREATE TABLE IF NOT EXISTS ');
    try { await d1Query(PREVIEW_DB, safeSQL); } catch (e) {}

    if (rowCount > 0) {
      const BATCH_SIZE = 20;
      const cols = await d1Query(PROD_DB, `PRAGMA table_info("${tableName.replace(/"/g, '""')}")`);
      const columns = cols[0].results.map(r => r.name);
      const colList = columns.map(c => `"${c.replace(/"/g, '""')}"`).join(', ');

      let offset = 0;
      let inserted = 0;
      while (offset < rowCount) {
        const rows = await exportTableData(PROD_DB, tableName, offset, BATCH_SIZE);
        if (rows.length === 0) break;

        const insertStmts = rows.map(row => {
          const vals = columns.map(c => formatValue(row[c])).join(', ');
          return `INSERT OR REPLACE INTO "${tableName.replace(/"/g, '""')}" (${colList}) VALUES (${vals})`;
        });

        let batchFailed = false;
        try {
          await d1Batch(PREVIEW_DB, insertStmts);
          inserted += rows.length;
        } catch (e) {
          batchFailed = true;
        }

        if (batchFailed) {
          for (const stmt of insertStmts) {
            try { await d1Query(PREVIEW_DB, stmt); inserted++; } catch (e2) {}
          }
        }

        offset += rows.length;
        await delay(50);
      }
      totalInserted += inserted;
      console.log(`  ${tableName}: ${inserted}/${rowCount} rows`);
    } else {
      console.log(`  ${tableName}: 0 rows (empty)`);
    }
    processedTables++;
  }

  console.log('\n=== SYNC COMPLETE ===');
  console.log(`Tables: ${processedTables}/${sorted.length}`);
  console.log(`Total rows inserted: ${totalInserted}`);
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
