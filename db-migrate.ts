import { D1Database } from '@cloudflare/workers-types';
// @ts-ignore
import SCHEMA_SQL from "./schema.sql";

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

export async function runAutoMigration(db: D1Database): Promise<void> {
  console.log('[Auto-Migration] Starting schema migration...');
  const { missingTables, missingColumns } = await checkMigrations(db);

  // Create missing tables
  for (const tableSql of missingTables) {
    try {
      await db.prepare(tableSql).run();
      console.log('[Auto-Migration] Applied:', tableSql.substring(0, 50) + '...');
    } catch (e) {
      console.error('[Auto-Migration] Error applying table sql:', e);
    }
  }

  // Add missing columns
  for (const colSql of missingColumns) {
    try {
      await db.prepare(colSql).run();
      console.log('[Auto-Migration] Applied:', colSql);
    } catch (e) {
      console.error('[Auto-Migration] Error applying column sql:', e);
    }
  }

  // Fix: remove NOT NULL constraint from PushSubscriptions.user_id (needed for anonymous devices)
  try {
    const tableInfo = await db.prepare("PRAGMA table_info(PushSubscriptions)").all() as any;
    const userIdCol = (tableInfo.results || []).find((c: any) => c.name === 'user_id');
    if (userIdCol && userIdCol.notnull === 1) {
      console.log('[Auto-Migration] PushSubscriptions.user_id has NOT NULL — recreating table to make it nullable...');
      const existingCols = (tableInfo.results || []).map((c: any) => c.name);
      const newTableCols = ['id', 'user_id', 'endpoint', 'subscription_json', 'fcm_token', 'device_id', 'platform', 'user_agent', 'last_active_at', 'created_at'];
      const commonCols = existingCols.filter((c: string) => newTableCols.includes(c));
      const colList = commonCols.join(', ');
      await db.prepare(`
        CREATE TABLE PushSubscriptions_new (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          endpoint TEXT,
          subscription_json TEXT,
          fcm_token TEXT,
          device_id TEXT,
          platform TEXT CHECK(platform IN ('web', 'flutter_android', 'flutter_ios', 'flutter_web')) NOT NULL DEFAULT 'web',
          user_agent TEXT,
          last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
        )
      `).run();
      if (commonCols.length > 0) {
        await db.prepare(`INSERT INTO PushSubscriptions_new (${colList}) SELECT ${colList} FROM PushSubscriptions`).run();
      }
      await db.prepare("DROP TABLE PushSubscriptions").run();
      await db.prepare("ALTER TABLE PushSubscriptions_new RENAME TO PushSubscriptions").run();
      console.log('[Auto-Migration] PushSubscriptions.user_id NOT NULL constraint removed successfully');
    }
  } catch (e) {
    console.error('[Auto-Migration] Error fixing PushSubscriptions.user_id constraint:', e);
  }

  console.log('[Auto-Migration] Schema migration complete');
}

export async function exportDatabaseToJson(db: D1Database): Promise<string> {
  const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const dumpData: Record<string, any[]> = {};

  if (tables.results) {
    for (const row of tables.results) {
      const tableName = row.name as string;
      if (tableName === 'sqlite_sequence' || tableName === '_cf_KV') continue;

      const tableData = await db.prepare(`SELECT * FROM ${tableName}`).all();
      dumpData[tableName] = tableData.results || [];
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
