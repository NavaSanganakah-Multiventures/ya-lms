import { D1Database } from '@cloudflare/workers-types';
// @ts-ignore
import SCHEMA_SQL from "./schema.sql";

// --- Migration Tracking ---

async function ensureMigrationsTable(db: D1Database): Promise<void> {
  await db.prepare("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
}

async function isMigrationApplied(db: D1Database, id: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 FROM _migrations WHERE id = ?").bind(id).first();
  return !!row;
}

async function markMigrationApplied(db: D1Database, id: string): Promise<void> {
  await db.prepare("INSERT OR IGNORE INTO _migrations (id) VALUES (?)").bind(id).run();
}

// --- Schema Introspection ---

function getTableColumnsFromSchema(sql: string, tableName: string): string[] | null {
  const stmtMatch = sql.match(new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${tableName}\\s*\\(([\\s\\S]*?)\\)\\s*;`, 'i'));
  if (!stmtMatch) return null;

  const body = stmtMatch[1];
  let depth = 0;
  let current = '';
  const colsDef: string[] = [];
  const cols: string[] = [];

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      colsDef.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) colsDef.push(current.trim());

  for (const def of colsDef) {
    const trimmed = def.trim();
    const nameMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (!nameMatch) continue;
    const firstWord = nameMatch[1].toUpperCase();
    if (['FOREIGN', 'PRIMARY', 'UNIQUE', 'CHECK', 'CONSTRAINT'].includes(firstWord)) continue;
    cols.push(trimmed.split(/\s+/)[0]);
  }

  return cols;
}

function getCreateTableDDL(sql: string, tableName: string): string | null {
  const match = sql.match(new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${tableName}[^;]*;`, 'i'));
  return match ? match[0] : null;
}

// --- Table Recreate (for constraint changes) ---

async function recreateTableFromSchema(db: D1Database, tableName: string): Promise<void> {
  const schemaCols = getTableColumnsFromSchema(SCHEMA_SQL, tableName);
  const ddl = getCreateTableDDL(SCHEMA_SQL, tableName);
  if (!schemaCols || !ddl) throw new Error(`Table ${tableName} not found in schema.sql`);

  const existingColsQuery = await db.prepare(`PRAGMA table_info(${tableName})`).all() as any;
  const existingCols = (existingColsQuery.results || []).map((c: any) => c.name);
  const commonCols = existingCols.filter((c: string) => schemaCols.includes(c));
  const colList = commonCols.join(', ');

  try {
    await db.prepare('PRAGMA foreign_keys = OFF').run();

    const newDDL = ddl.replace(
      new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${tableName}`, 'i'),
      `CREATE TABLE ${tableName}_new`
    );

    const statements: any[] = [db.prepare(newDDL)];
    if (commonCols.length > 0) {
      statements.push(db.prepare(`INSERT INTO ${tableName}_new (${colList}) SELECT ${colList} FROM ${tableName}`));
    }
    statements.push(db.prepare(`DROP TABLE ${tableName}`));
    statements.push(db.prepare(`ALTER TABLE ${tableName}_new RENAME TO ${tableName}`));

    // Run all DDL statements atomically via db.batch — D1 batch executes
    // within a single transaction and auto-rolls back on failure.
    await db.batch(statements);
  } catch (err) {
    throw err;
  } finally {
    await db.prepare('PRAGMA foreign_keys = ON').run();
  }
}

export async function checkMigrations(db: D1Database) {
  const statements = SCHEMA_SQL.split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && s.toUpperCase().startsWith('CREATE TABLE'));

  const missingTables: string[] = [];
  const missingColumns: string[] = [];

  for (const statement of statements) {
    const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
    if (!tableMatch) continue;

    const tableName = tableMatch[1];

    // Check if table exists
    try {
      const tableInfo = await db.prepare(`PRAGMA table_info(${tableName})`).all();
      if (!tableInfo.results || tableInfo.results.length === 0) {
        missingTables.push(statement);
        continue;
      }

      const existingCols = new Set(tableInfo.results.map((c: any) => c.name.toLowerCase()));

      // Basic column extraction from statement (Very simplified parsing)
      // Extract everything between the first ( and the last )
      const colsMatch = statement.substring(statement.indexOf('(') + 1, statement.lastIndexOf(')'));
      if (colsMatch) {
        // split by comma, ignoring commas inside parentheses (like CHECK(type IN ('a', 'b')))
        // A basic regex split won't work well for CHECK constraints, so we do a simple character loop
        let depth = 0;
        let currentCol = '';
        const colsDef = [];

        for (let i = 0; i < colsMatch.length; i++) {
          const char = colsMatch[i];
          if (char === '(') depth++;
          else if (char === ')') depth--;
          else if (char === ',' && depth === 0) {
            colsDef.push(currentCol.trim());
            currentCol = '';
            continue;
          }
          currentCol += char;
        }
        if (currentCol.trim()) colsDef.push(currentCol.trim());

        for (const colDef of colsDef) {
          const trimmedCol = colDef.trim();
          if (!trimmedCol) continue;

          const match = trimmedCol.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
          if (!match) continue;

          const firstWord = match[1].toUpperCase();
          if (['FOREIGN', 'PRIMARY', 'UNIQUE', 'CHECK', 'CONSTRAINT'].includes(firstWord)) continue;

          const colName = trimmedCol.split(/\s+/)[0];
          if (!existingCols.has(colName.toLowerCase())) {
            let addColSql = trimmedCol;
            // SQLite ALTER TABLE ADD COLUMN does not support CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_TIME as default values
            addColSql = addColSql.replace(/\s+DEFAULT\s+CURRENT_(TIMESTAMP|DATE|TIME)/i, '');
            missingColumns.push(`ALTER TABLE ${tableName} ADD COLUMN ${addColSql}`);
          }
        }
      }
    } catch (e) {
      console.error("Error checking table", tableName, e);
    }
  }

  return { missingTables, missingColumns };
}

export async function runAutoMigration(db: D1Database): Promise<string> {
  let logs = '[Auto-Migration] Starting schema migration...\n';
  console.log('[Auto-Migration] Starting schema migration...');

  // Ensure migration tracking exists
  await ensureMigrationsTable(db);

  // Tracked migration: rename recording_url to audio_url BEFORE checkMigrations
  if (!(await isMigrationApplied(db, 'v003_rename_recording_url_to_audio_url'))) {
    try {
      const tableInfo = await db.prepare("PRAGMA table_info(Lessons)").all() as any;
      const hasOldCol = (tableInfo.results || []).some((c: any) => c.name === 'recording_url');
      if (hasOldCol) {
        const msg = '[Auto-Migration] v003: Renaming recording_url to audio_url...';
        console.log(msg);
        logs += msg + '\n';
        await db.prepare("ALTER TABLE Lessons RENAME COLUMN recording_url TO audio_url").run();
      }
      await markMigrationApplied(db, 'v003_rename_recording_url_to_audio_url');
    } catch (e) {
      const err = `[Auto-Migration] Error v003: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }

  // Tracked migration: split credit wallets balances BEFORE checkMigrations
  if (!(await isMigrationApplied(db, 'v004_credit_wallets_split'))) {
    try {
      const msg = '[Auto-Migration] v004: Splitting CreditWallets balances...';
      console.log(msg);
      logs += msg + '\n';

      // Phase 1: CreditWallets - split balance into type-specific columns
      const walletInfo = await db.prepare("PRAGMA table_info(CreditWallets)").all() as any;
      const hasWalletOldCol = (walletInfo.results || []).some((c: any) => c.name === 'balance');

      if (hasWalletOldCol) {
        const hasWalletNewCol = (walletInfo.results || []).some((c: any) => c.name === 'ai_balance');

        if (!hasWalletNewCol) {
          await db.prepare("ALTER TABLE CreditWallets ADD COLUMN ai_balance INTEGER DEFAULT 0").run();
          await db.prepare("ALTER TABLE CreditWallets ADD COLUMN live_class_balance INTEGER DEFAULT 0").run();
          await db.prepare("ALTER TABLE CreditWallets ADD COLUMN self_study_balance INTEGER DEFAULT 0").run();
          await db.prepare("ALTER TABLE CreditWallets ADD COLUMN lifetime_ai_credits INTEGER DEFAULT 0").run();
          await db.prepare("ALTER TABLE CreditWallets ADD COLUMN lifetime_live_class_credits INTEGER DEFAULT 0").run();
          await db.prepare("ALTER TABLE CreditWallets ADD COLUMN lifetime_self_study_credits INTEGER DEFAULT 0").run();
        }

        await db.prepare("UPDATE CreditWallets SET ai_balance = balance, lifetime_ai_credits = lifetime_credits").run();

        await recreateTableFromSchema(db, 'CreditWallets');
      }

      // Phase 2: CreditLedger - add credit_type column (independent of wallet state)
      const ledgerInfo = await db.prepare("PRAGMA table_info(CreditLedger)").all() as any;
      const hasLedgerTypeCol = (ledgerInfo.results || []).some((c: any) => c.name === 'credit_type');

      if (!hasLedgerTypeCol) {
        await recreateTableFromSchema(db, 'CreditLedger');
      }

      await markMigrationApplied(db, 'v004_credit_wallets_split');
    } catch (e) {
      const err = `[Auto-Migration] Error v004: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }

  const { missingTables, missingColumns } = await checkMigrations(db);

  // Create missing tables
  for (const tableSql of missingTables) {
    try {
      await db.prepare(tableSql).run();
      const msg = `[Auto-Migration] Applied: ${tableSql.substring(0, 50)}...`;
      console.log(msg);
      logs += msg + '\n';
    } catch (e) {
      const err = `[Auto-Migration] Error applying table sql: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }

  // Add missing columns
  for (const colSql of missingColumns) {
    try {
      await db.prepare(colSql).run();
      const msg = `[Auto-Migration] Applied: ${colSql}`;
      console.log(msg);
      logs += msg + '\n';
    } catch (e) {
      const err = `[Auto-Migration] Error applying column sql: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }


  // Tracked migration: remove UNIQUE constraint from LiveSessions.rtc_room_id
  if (!(await isMigrationApplied(db, 'v001_remove_livesessions_rtc_unique'))) {
    try {
      const tableCreateSql = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='LiveSessions'").first() as any;
      if (tableCreateSql && tableCreateSql.sql && /rtc_room_id[^,]+UNIQUE|UNIQUE\s*\(\s*['"]?rtc_room_id['"]?\s*\)/i.test(tableCreateSql.sql)) {
        const msg = '[Auto-Migration] v001: Removing UNIQUE constraint from LiveSessions.rtc_room_id...';
        console.log(msg);
        logs += msg + '\n';
        await recreateTableFromSchema(db, 'LiveSessions');
      }
      await markMigrationApplied(db, 'v001_remove_livesessions_rtc_unique');
      const doneMsg = '[Auto-Migration] v001: Checked/Applied';
      console.log(doneMsg);
      logs += doneMsg + '\n';
    } catch (e) {
      const err = `[Auto-Migration] Error running v001_remove_livesessions_rtc_unique: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }

  // Tracked migration: remove NOT NULL constraint from PushSubscriptions.user_id
  if (!(await isMigrationApplied(db, 'v002_make_pushsubscriptions_user_id_nullable'))) {
    try {
      const tableInfo = await db.prepare("PRAGMA table_info(PushSubscriptions)").all() as any;
      const userIdCol = (tableInfo.results || []).find((c: any) => c.name === 'user_id');
      if (userIdCol && userIdCol.notnull === 1) {
        const msg = '[Auto-Migration] v002: Making PushSubscriptions.user_id nullable...';
        console.log(msg);
        logs += msg + '\n';
        await recreateTableFromSchema(db, 'PushSubscriptions');
      }
      await markMigrationApplied(db, 'v002_make_pushsubscriptions_user_id_nullable');
      const doneMsg = '[Auto-Migration] v002: Checked/Applied';
      console.log(doneMsg);
      logs += doneMsg + '\n';
    } catch (e) {
      const err = `[Auto-Migration] Error running v002_make_pushsubscriptions_user_id_nullable: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }

  const finishMsg = '[Auto-Migration] Schema migration complete';
  console.log(finishMsg);
  logs += finishMsg + '\n';
  return logs;
}

export async function exportDatabaseToJson(db: D1Database): Promise<string> {
  const tables = await db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
  const dumpData: Record<string, { schema: string, rows: any[] }> = {};

  if (tables.results) {
    for (const row of tables.results) {
      const tableName = row.name as string;
      const tableSql = row.sql as string;
      if (tableName === 'sqlite_sequence' || tableName === '_cf_KV') continue;

      const tableData = await db.prepare(`SELECT * FROM ${tableName}`).all();
      dumpData[tableName] = {
        schema: tableSql,
        rows: tableData.results || []
      };
    }
  }

  return JSON.stringify(dumpData);
}

export async function importDatabaseFromJson(db: D1Database, jsonDump: string): Promise<void> {
  const dumpData = JSON.parse(jsonDump);
  const statements: any[] = [];

  for (const [tableName, rows] of Object.entries(dumpData)) {
    if (tableName === 'sqlite_sequence' || tableName === '_cf_KV') continue;

    // Clear existing data
    statements.push(db.prepare(`DELETE FROM ${tableName}`));

    // Insert new data
    for (const row of rows as any[]) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map(() => '?').join(', ');

      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      statements.push(db.prepare(sql).bind(...values));
    }
  }

  const chunkSize = 100;
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize);
    await db.batch(chunk);
  }
}
