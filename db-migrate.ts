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
           const firstWord = colDef.trim().split(/\s+/)[0];
           if (firstWord.toUpperCase() === 'FOREIGN' || firstWord.toUpperCase() === 'PRIMARY' || firstWord.toUpperCase() === 'UNIQUE' || firstWord.toUpperCase() === 'CHECK') continue;

           if (!existingCols.has(firstWord.toLowerCase())) {
             missingColumns.push(`ALTER TABLE ${tableName} ADD COLUMN ${colDef}`);
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

  console.log('[Auto-Migration] Schema migration complete');
}

export async function exportDatabaseToJson(db: D1Database): Promise<string> {
  const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const dumpData: Record<string, any[]> = {};
  const excludedTables = ['sqlite_sequence', '_cf_KV', 'ErrorSessions', 'ErrorSessionEvents', 'ChatHistory'];

  if (tables.results) {
    for (const row of tables.results) {
      const tableName = row.name as string;
      if (excludedTables.includes(tableName)) continue;

      const tableData = await db.prepare(`SELECT * FROM ${tableName} LIMIT 5000`).all();
      dumpData[tableName] = tableData.results || [];
    }
  }

  return JSON.stringify(dumpData);
}

  return JSON.stringify(dumpData);
}
