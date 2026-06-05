import { TABLE_SCHEMAS, type ColumnDef } from './schema';

const BATCH_SIZE = 50;
const PRAGMA_BATCH = 20;

function buildAlterColumnDef(col: ColumnDef): string {
  let def = col.type;
  if (col.nullable === false) {
    def += ' NOT NULL';
  }
  if (col.defaultSql !== undefined) {
    def += ` DEFAULT ${col.defaultSql}`;
  }
  return def;
}

async function runMigrateCreateTables(db: D1Database): Promise<void> {
  const allStatements = Object.values(TABLE_SCHEMAS).map((t) => db.prepare(t.createSql));
  for (let i = 0; i < allStatements.length; i += BATCH_SIZE) {
    await db.batch(allStatements.slice(i, i + BATCH_SIZE));
  }
}

async function runMigrateMissingColumns(db: D1Database): Promise<void> {
  const entries = Object.entries(TABLE_SCHEMAS);
  const alterStatements: D1PreparedStatement[] = [];

  for (let i = 0; i < entries.length; i += PRAGMA_BATCH) {
    const batch = entries.slice(i, i + PRAGMA_BATCH);
    const tableInfos = await db.batch(
      batch.map(([tableName]) => db.prepare(`PRAGMA table_info(${tableName})`)),
    );
    tableInfos.forEach((res, idx) => {
      const [tableName, schema] = batch[idx];
      const existingCols = new Set(
        ((res.results || []) as any[]).map((c: any) => c.name.toLowerCase()),
      );
      for (const col of schema.columns) {
        if (!existingCols.has(col.name.toLowerCase())) {
          const colDef = buildAlterColumnDef(col);
          alterStatements.push(
            db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${colDef}`),
          );
          console.log(`[Auto-Migration] Added column ${col.name} to ${tableName}`);
        }
      }
    });
  }

  for (let i = 0; i < alterStatements.length; i += BATCH_SIZE) {
    await db.batch(alterStatements.slice(i, i + BATCH_SIZE));
  }
}

async function runMigrateIndexes(db: D1Database): Promise<void> {
  const allIndexes: D1PreparedStatement[] = [];
  for (const schema of Object.values(TABLE_SCHEMAS)) {
    if (schema.indexes) {
      for (const idxSql of schema.indexes) {
        allIndexes.push(db.prepare(idxSql));
      }
    }
  }
  for (let i = 0; i < allIndexes.length; i += BATCH_SIZE) {
    await db.batch(allIndexes.slice(i, i + BATCH_SIZE));
  }
}

export async function runAutoMigration(db: D1Database): Promise<void> {
  console.log('[Auto-Migration] Starting schema migration...');

  await runMigrateCreateTables(db);
  console.log('[Auto-Migration] CREATE TABLE statements applied');

  await runMigrateMissingColumns(db);
  console.log('[Auto-Migration] Missing columns added');

  await runMigrateIndexes(db);
  console.log('[Auto-Migration] Indexes applied');

  console.log('[Auto-Migration] Schema migration complete');
}
