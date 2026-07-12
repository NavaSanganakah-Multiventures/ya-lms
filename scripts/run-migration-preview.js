const https = require('https');
const fs = require('fs');
const path = require('path');

const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secrets.local.json'), 'utf8'));
const ACCOUNT_ID = secrets.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = secrets.CLOUDFLARE_API_TOKEN;
const PREVIEW_DB = '8ac6d05f-1638-41b0-ac81-83238abad191';

function d1Query(sql, retries = 3) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql });
    const opts = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${ACCOUNT_ID}/d1/database/${PREVIEW_DB}/query`,
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
      if (retries > 0) { await delay(2000); resolve(d1Query(sql, retries - 1)); }
      else reject(err);
    });
    req.write(body);
    req.end();
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));
const logs = [];

function log(msg) {
  console.log(msg);
  logs.push(msg);
}

async function hasColumn(table, col) {
  const r = await d1Query(`PRAGMA table_info("${table}")`);
  return r[0].results.some(c => c.name === col);
}

async function addColumn(table, col, type, def = '') {
  if (!(await hasColumn(table, col))) {
    await d1Query(`ALTER TABLE "${table}" ADD COLUMN ${col} ${type} ${def}`);
    log(`  + ${table}.${col}`);
    return true;
  }
  return false;
}

async function dropColumn(table, col) {
  if (await hasColumn(table, col)) {
    try {
      await d1Query(`ALTER TABLE "${table}" DROP COLUMN "${col}"`);
      log(`  - ${table}.${col}`);
    } catch (e) {
      log(`  ! Could not drop ${table}.${col}: ${e.message.substring(0, 80)}`);
    }
  }
}

async function renameColumn(table, oldName, newName) {
  if (await hasColumn(table, oldName)) {
    if (!(await hasColumn(table, newName))) {
      try {
        await d1Query(`ALTER TABLE "${table}" RENAME COLUMN "${oldName}" TO "${newName}"`);
        log(`  ~ ${table}.${oldName} -> ${newName}`);
      } catch (e) {
        log(`  ! Could not rename ${table}.${oldName}: ${e.message.substring(0, 80)}`);
      }
    } else {
      log(`  ~ ${table}.${newName} already exists, skipping rename from ${oldName}`);
    }
  }
}

async function applyMigration(id, fn) {
  const check = await d1Query(`SELECT 1 FROM _migrations WHERE id='${id}'`);
  if (check[0].results.length > 0) {
    log(`  ${id}: already applied, skipping`);
    return;
  }
  log(`  Running ${id}...`);
  await fn();
  await d1Query(`INSERT INTO _migrations (id) VALUES ('${id}')`);
  log(`  ${id}: done`);
}

async function checkSchemaDiff() {
  log('\n=== Schema Diff (checkMigrations) ===');
  
  const schemaSQL = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  const statements = schemaSQL.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  let missingCols = 0;
  let missingIndices = 0;
  
  for (const stmt of statements) {
    const upper = stmt.toUpperCase();
    
    // Check missing columns from CREATE TABLE
    if (upper.startsWith('CREATE TABLE')) {
      const nameMatch = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?\s*\(/i);
      if (!nameMatch) continue;
      const tableName = nameMatch[1];
      
      // Parse column names from DDL
      const bodyMatch = stmt.match(/\(([\s\S]*)\)$/);
      if (!bodyMatch) continue;
      
      const body = bodyMatch[1];
      const colNames = [];
      let depth = 0;
      let current = '';
      for (const ch of body) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === ',' && depth === 0) {
          colNames.push(current.trim());
          current = '';
          continue;
        }
        current += ch;
      }
      if (current.trim()) colNames.push(current.trim());
      
      for (const colDef of colNames) {
        const upperCol = colDef.toUpperCase().trim();
        if (upperCol.startsWith('FOREIGN') || upperCol.startsWith('PRIMARY') || 
            upperCol.startsWith('UNIQUE') || upperCol.startsWith('CHECK') || 
            upperCol.startsWith('CONSTRAINT')) continue;
        
        const colNameMatch = colDef.match(/^\s*[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?\s+/);
        if (!colNameMatch) continue;
        const colName = colNameMatch[1];
        
        if (!(await hasColumn(tableName, colName))) {
          // Extract column definition (everything after column name)
          const fullColDef = colDef.trim();
          try {
            await d1Query(`ALTER TABLE "${tableName}" ADD COLUMN ${fullColDef}`);
            log(`  [schema] + ${tableName}.${colName}`);
            missingCols++;
          } catch (e) {
            log(`  [schema] ! Could not add ${tableName}.${colName}: ${e.message.substring(0, 80)}`);
          }
          await delay(100);
        }
      }
    }
    
    // Check missing indices
    if (upper.startsWith('CREATE INDEX')) {
      const idxMatch = stmt.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?\s+ON/i);
      if (!idxMatch) continue;
      const idxName = idxMatch[1];
      
      const exists = await d1Query(`SELECT 1 FROM sqlite_master WHERE type='index' AND name='${idxName}'`);
      if (exists[0].results.length === 0) {
        try {
          await d1Query(stmt);
          log(`  [schema] + index ${idxName}`);
          missingIndices++;
        } catch (e) {
          log(`  [schema] ! Could not create index ${idxName}: ${e.message.substring(0, 80)}`);
        }
        await delay(100);
      }
    }
  }
  
  log(`  Schema diff: ${missingCols} columns added, ${missingIndices} indices created`);
}

async function main() {
  log('=== Running Migration on Preview D1 ===\n');

  // v005: credits_to_rupees
  log('--- v005: credits_to_rupees ---');
  await applyMigration('v005_credits_to_rupees', async () => {
    await addColumn('CreditWallets', 'balance_rupees', 'REAL NOT NULL DEFAULT 0');
    await addColumn('CreditWallets', 'lifetime_deposits_rupees', 'REAL NOT NULL DEFAULT 0');
    await addColumn('CreditWallets', 'lifetime_withdrawals_rupees', 'REAL NOT NULL DEFAULT 0');
    
    // Data: balance_rupees = sum(all credit balances) / 10
    await d1Query(`UPDATE CreditWallets SET balance_rupees = (COALESCE(ai_balance,0) + COALESCE(live_class_balance,0) + COALESCE(self_study_balance,0)) / 10.0, lifetime_deposits_rupees = (COALESCE(lifetime_ai_credits,0) + COALESCE(lifetime_live_class_credits,0) + COALESCE(lifetime_self_study_credits,0)) / 10.0 WHERE balance_rupees = 0`);
    
    await addColumn('Courses', 'wallet_rupees', 'REAL DEFAULT 0');
    await d1Query(`UPDATE Courses SET wallet_rupees = (COALESCE(self_study_credit_cost,0) + COALESCE(individual_class_credit_cost,0)) / 20.0 WHERE wallet_rupees = 0`);
    
    await addColumn('Books', 'wallet_rupees', 'REAL DEFAULT 0');
    await d1Query(`UPDATE Books SET wallet_rupees = COALESCE(self_study_credit_cost,0) / 10.0 WHERE wallet_rupees = 0`);
    
    await addColumn('Batches', 'cost_per_class_rupees', 'REAL DEFAULT 0');
    await d1Query(`UPDATE Batches SET cost_per_class_rupees = COALESCE(group_class_credit_cost,0) / 10.0 WHERE cost_per_class_rupees = 0`);
    
    await addColumn('IndividualBookings', 'amount_charged_rupees', 'REAL DEFAULT 0');
    await addColumn('IndividualBookings', 'amount_refunded_rupees', 'REAL DEFAULT 0');
    await d1Query(`UPDATE IndividualBookings SET amount_charged_rupees = COALESCE(credits_charged,0) / 10.0 WHERE amount_charged_rupees = 0`);
    await d1Query(`UPDATE IndividualBookings SET amount_refunded_rupees = COALESCE(credits_refunded,0) / 10.0 WHERE amount_refunded_rupees = 0`);
    
    await addColumn('CreditLedger', 'change_rupees', 'REAL NOT NULL DEFAULT 0');
    await addColumn('CreditLedger', 'balance_after_rupees', 'REAL NOT NULL DEFAULT 0');
    await d1Query(`UPDATE CreditLedger SET change_rupees = COALESCE(change_amount,0) / 10.0, balance_after_rupees = COALESCE(balance_after,0) / 10.0 WHERE change_rupees = 0`);
    
    await addColumn('Subscriptions', 'live_class_amount_rupees', 'REAL DEFAULT 0');
    await d1Query(`UPDATE Subscriptions SET live_class_amount_rupees = COALESCE(live_class_credits,0) / 10.0 WHERE live_class_amount_rupees = 0`);
    
    await addColumn('SubscriptionPlans', 'live_class_amount_rupees', 'REAL DEFAULT 0');
    await d1Query(`UPDATE SubscriptionPlans SET live_class_amount_rupees = COALESCE(live_class_credits,0) / 10.0 WHERE live_class_amount_rupees = 0`);
  });

  await delay(500);

  // v006: rename old _inr to _rupees
  log('\n--- v006: rename_inr_to_rupees ---');
  await applyMigration('v006_rename_inr_to_rupees', async () => {
    // CreditWallets
    await renameColumn('CreditWallets', 'balance_inr', 'balance_rupees');
    await renameColumn('CreditWallets', 'lifetime_deposits_inr', 'lifetime_deposits_rupees');
    await renameColumn('CreditWallets', 'lifetime_withdrawals_inr', 'lifetime_withdrawals_rupees');
    // Courses
    await renameColumn('Courses', 'cost_inr', 'wallet_rupees');
    await renameColumn('Courses', 'trial_upgrade_price_inr', 'trial_upgrade_price_rupees');
    // Books
    await renameColumn('Books', 'cost_inr', 'wallet_rupees');
    // Batches
    await renameColumn('Batches', 'cost_per_class_inr', 'cost_per_class_rupees');
    // CreditLedger
    await renameColumn('CreditLedger', 'change_amount_inr', 'change_rupees');
    await renameColumn('CreditLedger', 'balance_after_inr', 'balance_after_rupees');
    // IndividualBookings
    await renameColumn('IndividualBookings', 'amount_charged_inr', 'amount_charged_rupees');
    await renameColumn('IndividualBookings', 'amount_refunded_inr', 'amount_refunded_rupees');
    // Subscriptions
    await renameColumn('Subscriptions', 'live_class_amount_inr', 'live_class_amount_rupees');
    await renameColumn('Subscriptions', 'lifetime_price_inr', 'lifetime_price_rupees');
    // SubscriptionPlans
    await renameColumn('SubscriptionPlans', 'live_class_amount_inr', 'live_class_amount_rupees');
  });

  await delay(500);

  // v007: drop dead credit columns
  log('\n--- v007: drop_dead_credit_columns ---');
  await applyMigration('v007_drop_dead_credit_columns', async () => {
    await dropColumn('CreditWallets', 'ai_balance');
    await dropColumn('CreditWallets', 'live_class_balance');
    await dropColumn('CreditWallets', 'self_study_balance');
    await dropColumn('CreditWallets', 'lifetime_ai_credits');
    await dropColumn('CreditWallets', 'lifetime_live_class_credits');
    await dropColumn('CreditWallets', 'lifetime_self_study_credits');
    
    await dropColumn('CreditLedger', 'change_amount');
    await dropColumn('CreditLedger', 'balance_after');
    await dropColumn('CreditLedger', 'credit_type');
    
    await dropColumn('CreditPacks', 'credit_type');
    
    await d1Query('DROP TABLE IF EXISTS CreditPlans');
    log('  Dropped CreditPlans table');
  });

  await delay(500);

  // v008: drop deprecated Users.ai_credits
  log('\n--- v008: drop_users_ai_credits ---');
  await applyMigration('v008_drop_users_ai_credits', async () => {
    await dropColumn('Users', 'ai_credits');
    log('  Dropped Users.ai_credits');
  });

  await delay(500);

  // Cleanup _OLD tables
  log('\n--- Cleanup _OLD tables ---');
  const oldTables = await d1Query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%[_]OLD'");
  for (const row of oldTables[0].results) {
    await d1Query(`DROP TABLE IF EXISTS "${row.name}"`);
    log(`  Dropped ${row.name}`);
  }

  await delay(500);

  // Schema diff
  await checkSchemaDiff();

  log('\n=== MIGRATION COMPLETE ===');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
