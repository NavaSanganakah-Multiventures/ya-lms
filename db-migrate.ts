import { D1Database } from '@cloudflare/workers-types';
// @ts-ignore
import SCHEMA_SQL from "./schema.sql";

// --- Topological Sort for Table Creation Order ---

function parseTableNamesAndDeps(sqlSchema: string): { tables: string[]; deps: Map<string, Set<string>> } {
  const tablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?\s*\(/gi;
  const fkPattern = /FOREIGN\s+KEY\s*\([^)]*\)\s*REFERENCES\s*[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?/gi;

  const tables: string[] = [];
  const deps = new Map<string, Set<string>>();

  const statements = sqlSchema.split(';').map(s => s.trim()).filter(s => s.length > 0);

  for (const stmt of statements) {
    const upperStmt = stmt.toUpperCase();
    if (!upperStmt.startsWith('CREATE TABLE') && !upperStmt.startsWith('CREATE\nTABLE')) continue;

    const nameMatch = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?\s*\(/i);
    if (!nameMatch) continue;

    const tableName = nameMatch[1];
    tables.push(tableName);

    const tableDeps = new Set<string>();
    let fkMatch;
    const fkRegex = /FOREIGN\s+KEY\s*\([^)]*\)\s*REFERENCES\s*[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?/gi;
    while ((fkMatch = fkRegex.exec(stmt)) !== null) {
      const refTable = fkMatch[1];
      if (refTable !== tableName) {
        tableDeps.add(refTable);
      }
    }
    deps.set(tableName, tableDeps);
  }

  return { tables, deps };
}

export function getTopologicallySortedTables(sqlSchema: string): string[] {
  const { tables, deps } = parseTableNamesAndDeps(sqlSchema);
  const tableSet = new Set(tables);

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const t of tables) {
    inDegree.set(t, 0);
    adj.set(t, []);
  }

  for (const [table, tableDeps] of deps) {
    for (const dep of tableDeps) {
      if (!tableSet.has(dep)) continue;
      adj.get(dep)!.push(table);
      inDegree.set(table, (inDegree.get(table) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const t of tables) {
    if ((inDegree.get(t) || 0) === 0) {
      queue.push(t);
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of (adj.get(current) || [])) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  for (const t of tables) {
    if (!sorted.includes(t)) {
      sorted.push(t);
    }
  }

  return sorted;
}

export function sortQueriesByDependency(queries: string[]): string[] {
  const { tables, deps } = parseTableNamesAndDeps(queries.join(';\n') + ';');
  const tableSet = new Set(tables);

  const actionMap = new Map<string, { type: 'create' | 'drop' | 'alter'; query: string; table: string }>();
  for (const q of queries) {
    const upper = q.toUpperCase().trim();
    const createMatch = q.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?/i);
    const dropMatch = q.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?/i);
    const alterMatch = q.match(/ALTER\s+TABLE\s+[`"']?([a-zA-Z_][a-zA-Z0-9_]*)[`"']?/i);

    if (createMatch) {
      actionMap.set(q, { type: 'create', query: q, table: createMatch[1] });
    } else if (dropMatch) {
      actionMap.set(q, { type: 'drop', query: q, table: dropMatch[1] });
    } else if (alterMatch) {
      actionMap.set(q, { type: 'alter', query: q, table: alterMatch[1] });
    }
  }

  const createQueries: string[] = [];
  const alterQueries: string[] = [];
  const dropQueries: string[] = [];

  for (const q of queries) {
    const action = actionMap.get(q);
    if (!action) {
      createQueries.push(q);
      continue;
    }
    if (action.type === 'create') createQueries.push(q);
    else if (action.type === 'alter') alterQueries.push(q);
    else if (action.type === 'drop') dropQueries.push(q);
  }

  const sortedCreate: string[] = [];
  const createTables = createQueries.filter(q => {
    const action = actionMap.get(q);
    return action && action.type === 'create';
  });
  const createOthers = createQueries.filter(q => !createTables.includes(q));

  const sortedTableNames = getTopologicallySortedTables(createTables.join(';\n') + ';');
  for (const tName of sortedTableNames) {
    const matching = createTables.find(q => {
      const action = actionMap.get(q);
      return action && action.table === tName;
    });
    if (matching) sortedCreate.push(matching);
  }
  for (const q of createOthers) sortedCreate.push(q);

  return [...sortedCreate, ...alterQueries, ...dropQueries];
}

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
    const newDDL = ddl.replace(
      new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${tableName}`, 'i'),
      `CREATE TABLE ${tableName}_new`
    );

    const statements: any[] = [
      db.prepare('PRAGMA defer_foreign_keys = ON'),
      db.prepare(newDDL),
    ];
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
  }
}

export async function checkMigrations(db: D1Database) {
  const statements = SCHEMA_SQL.split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && s.toUpperCase().startsWith('CREATE TABLE'));

  const indexStatements = SCHEMA_SQL.split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && s.toUpperCase().startsWith('CREATE INDEX'));

  const missingTables: string[] = [];
  const missingColumns: string[] = [];
  const missingIndices: string[] = [];

  for (const statement of indexStatements) {
    const indexMatch = statement.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
    if (!indexMatch) continue;
    const indexName = indexMatch[1];

    try {
      const existingIndex: any = await db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?").bind(indexName).first();
      if (!existingIndex) {
        missingIndices.push(statement);
      }
    } catch (e) {
      console.error("Error checking index", indexName, e);
    }
  }

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

  return { missingTables, missingColumns, missingIndices };
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

  const { missingTables, missingColumns, missingIndices } = await checkMigrations(db);

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

  // Add missing indices
  for (const indexSql of missingIndices) {
    try {
      await db.prepare(indexSql).run();
      const msg = `[Auto-Migration] Applied Index: ${indexSql.substring(0, 50)}...`;
      console.log(msg);
      logs += msg + '\n';
    } catch (e) {
      const err = `[Auto-Migration] Error applying index sql: ${e}`;
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

  // Tracked migration: convert credit balances to single balance_rupees
  if (!(await isMigrationApplied(db, 'v005_credits_to_rupees'))) {
    try {
      const msg = '[Auto-Migration] v005: Converting credit balances to rupees (÷10)...';
      console.log(msg);
      logs += msg + '\n';

      // Add balance_rupees column if it doesn't exist
      const walletInfo = await db.prepare("PRAGMA table_info(CreditWallets)").all() as any;
      const colNames = (walletInfo.results || []).map((c: any) => c.name);
      const hasBalanceRupees = colNames.includes('balance_rupees');
      if (!hasBalanceRupees) {
        await db.prepare("ALTER TABLE CreditWallets ADD COLUMN balance_rupees REAL NOT NULL DEFAULT 0").run();
        await db.prepare("ALTER TABLE CreditWallets ADD COLUMN lifetime_deposits_rupees REAL NOT NULL DEFAULT 0").run();
        await db.prepare("ALTER TABLE CreditWallets ADD COLUMN lifetime_withdrawals_rupees REAL NOT NULL DEFAULT 0").run();
      }

      // Convert: balance_rupees = sum(all 3 credit balances) / 10
      await db.prepare(
        `UPDATE CreditWallets SET
           balance_rupees = (COALESCE(ai_balance,0) + COALESCE(live_class_balance,0) + COALESCE(self_study_balance,0)) / 10.0,
           lifetime_deposits_rupees = (COALESCE(lifetime_ai_credits,0) + COALESCE(lifetime_live_class_credits,0) + COALESCE(lifetime_self_study_credits,0)) / 10.0
         WHERE balance_rupees = 0`
      ).run();

      const converted = await db.prepare("SELECT COUNT(*) as cnt FROM CreditWallets WHERE balance_rupees > 0").first() as any;
      logs += `[Auto-Migration] v005: Converted ${converted?.cnt || 0} wallets to rupees\n`;

      // Add wallet_rupees to Courses if missing
      const coursesInfo = await db.prepare("PRAGMA table_info(Courses)").all() as any;
      const coursesCols = (coursesInfo.results || []).map((c: any) => c.name);
      if (!coursesCols.includes('wallet_rupees')) {
        await db.prepare("ALTER TABLE Courses ADD COLUMN wallet_rupees REAL DEFAULT 0").run();
      }
      // Migrate: wallet_rupees = old credit_costs / 10
      await db.prepare("UPDATE Courses SET wallet_rupees = (COALESCE(self_study_credit_cost,0) + COALESCE(individual_class_credit_cost,0)) / 20.0 WHERE wallet_rupees = 0").run();

      // Add wallet_rupees to Books
      const booksInfo = await db.prepare("PRAGMA table_info(Books)").all() as any;
      const booksCols = (booksInfo.results || []).map((c: any) => c.name);
      if (!booksCols.includes('wallet_rupees')) {
        await db.prepare("ALTER TABLE Books ADD COLUMN wallet_rupees REAL DEFAULT 0").run();
      }
      await db.prepare("UPDATE Books SET wallet_rupees = COALESCE(self_study_credit_cost,0) / 10.0 WHERE wallet_rupees = 0").run();

      // Add cost_per_class_rupees to Batches
      const batchesInfo = await db.prepare("PRAGMA table_info(Batches)").all() as any;
      const batchesCols = (batchesInfo.results || []).map((c: any) => c.name);
      if (!batchesCols.includes('cost_per_class_rupees')) {
        await db.prepare("ALTER TABLE Batches ADD COLUMN cost_per_class_rupees REAL DEFAULT 0").run();
      }
      await db.prepare("UPDATE Batches SET cost_per_class_rupees = COALESCE(live_class_credit_cost,0) / 10.0 WHERE cost_per_class_rupees = 0").run();

      // Add rupees columns to IndividualBookings
      const ibInfo = await db.prepare("PRAGMA table_info(IndividualBookings)").all() as any;
      const ibCols = (ibInfo.results || []).map((c: any) => c.name);
      if (!ibCols.includes('amount_charged_rupees')) {
        await db.prepare("ALTER TABLE IndividualBookings ADD COLUMN amount_charged_rupees REAL DEFAULT 0").run();
        await db.prepare("ALTER TABLE IndividualBookings ADD COLUMN amount_refunded_rupees REAL DEFAULT 0").run();
      }
      await db.prepare("UPDATE IndividualBookings SET amount_charged_rupees = COALESCE(credits_charged,0) / 10.0 WHERE amount_charged_rupees = 0").run();
      await db.prepare("UPDATE IndividualBookings SET amount_refunded_rupees = COALESCE(credits_refunded,0) / 10.0 WHERE amount_refunded_rupees = 0").run();

      // Add rupees columns to CreditLedger
      const ledgerInfo = await db.prepare("PRAGMA table_info(CreditLedger)").all() as any;
      const ledgerCols = (ledgerInfo.results || []).map((c: any) => c.name);
      if (!ledgerCols.includes('change_rupees')) {
        await db.prepare("ALTER TABLE CreditLedger ADD COLUMN change_rupees REAL NOT NULL DEFAULT 0").run();
        await db.prepare("ALTER TABLE CreditLedger ADD COLUMN balance_after_rupees REAL NOT NULL DEFAULT 0").run();
      }
      await db.prepare("UPDATE CreditLedger SET change_rupees = COALESCE(change_amount,0) / 10.0, balance_after_rupees = COALESCE(balance_after,0) / 10.0 WHERE change_rupees = 0").run();

      // Add live_class_amount_rupees to Subscriptions
      const subInfo = await db.prepare("PRAGMA table_info(Subscriptions)").all() as any;
      const subCols = (subInfo.results || []).map((c: any) => c.name);
      if (!subCols.includes('live_class_amount_rupees')) {
        await db.prepare("ALTER TABLE Subscriptions ADD COLUMN live_class_amount_rupees REAL DEFAULT 0").run();
      }
      await db.prepare("UPDATE Subscriptions SET live_class_amount_rupees = COALESCE(live_class_credits,0) / 10.0 WHERE live_class_amount_rupees = 0").run();

      // Add live_class_amount_rupees to SubscriptionPlans
      const plansInfo = await db.prepare("PRAGMA table_info(SubscriptionPlans)").all() as any;
      const plansCols = (plansInfo.results || []).map((c: any) => c.name);
      if (!plansCols.includes('live_class_amount_rupees')) {
        await db.prepare("ALTER TABLE SubscriptionPlans ADD COLUMN live_class_amount_rupees REAL DEFAULT 0").run();
      }
      await db.prepare("UPDATE SubscriptionPlans SET live_class_amount_rupees = COALESCE(live_class_credits,0) / 10.0 WHERE live_class_amount_rupees = 0").run();

      await markMigrationApplied(db, 'v005_credits_to_rupees');
      logs += '[Auto-Migration] v005: Done\n';
    } catch (e) {
      const err = `[Auto-Migration] Error v005: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }

  // Tracked migration: rename old _inr columns to _rupees for existing databases
  if (!(await isMigrationApplied(db, 'v006_rename_inr_to_rupees'))) {
    try {
      const msg = '[Auto-Migration] v006: Renaming old _inr columns to _rupees...';
      console.log(msg);
      logs += msg + '\n';

      // CreditWallets
      const walletInfo2 = await db.prepare("PRAGMA table_info(CreditWallets)").all() as any;
      const wCols = (walletInfo2.results || []).map((c: any) => c.name);
      if (wCols.includes('balance_inr') && !wCols.includes('balance_rupees')) {
        await db.prepare("ALTER TABLE CreditWallets RENAME COLUMN balance_inr TO balance_rupees").run();
        await db.prepare("ALTER TABLE CreditWallets RENAME COLUMN lifetime_deposits_inr TO lifetime_deposits_rupees").run();
        await db.prepare("ALTER TABLE CreditWallets RENAME COLUMN lifetime_withdrawals_inr TO lifetime_withdrawals_rupees").run();
      }

      // Courses
      const coursesInfo2 = await db.prepare("PRAGMA table_info(Courses)").all() as any;
      const cCols = (coursesInfo2.results || []).map((c: any) => c.name);
      if (cCols.includes('cost_inr') && !cCols.includes('wallet_rupees')) {
        await db.prepare("ALTER TABLE Courses RENAME COLUMN cost_inr TO wallet_rupees").run();
      }
      if (cCols.includes('trial_upgrade_price_inr') && !cCols.includes('trial_upgrade_price_rupees')) {
        await db.prepare("ALTER TABLE Courses RENAME COLUMN trial_upgrade_price_inr TO trial_upgrade_price_rupees").run();
      }

      // Books
      const booksInfo2 = await db.prepare("PRAGMA table_info(Books)").all() as any;
      const bCols = (booksInfo2.results || []).map((c: any) => c.name);
      if (bCols.includes('cost_inr') && !bCols.includes('wallet_rupees')) {
        await db.prepare("ALTER TABLE Books RENAME COLUMN cost_inr TO wallet_rupees").run();
      }

      // Batches
      const batchesInfo2 = await db.prepare("PRAGMA table_info(Batches)").all() as any;
      const batCols = (batchesInfo2.results || []).map((c: any) => c.name);
      if (batCols.includes('cost_per_class_inr') && !batCols.includes('cost_per_class_rupees')) {
        await db.prepare("ALTER TABLE Batches RENAME COLUMN cost_per_class_inr TO cost_per_class_rupees").run();
      }

      // CreditLedger
      const ledgerInfo2 = await db.prepare("PRAGMA table_info(CreditLedger)").all() as any;
      const lCols = (ledgerInfo2.results || []).map((c: any) => c.name);
      if (lCols.includes('change_amount_inr') && !lCols.includes('change_rupees')) {
        await db.prepare("ALTER TABLE CreditLedger RENAME COLUMN change_amount_inr TO change_rupees").run();
        await db.prepare("ALTER TABLE CreditLedger RENAME COLUMN balance_after_inr TO balance_after_rupees").run();
      }

      // IndividualBookings
      const ibInfo2 = await db.prepare("PRAGMA table_info(IndividualBookings)").all() as any;
      const ibCols2 = (ibInfo2.results || []).map((c: any) => c.name);
      if (ibCols2.includes('amount_charged_inr') && !ibCols2.includes('amount_charged_rupees')) {
        await db.prepare("ALTER TABLE IndividualBookings RENAME COLUMN amount_charged_inr TO amount_charged_rupees").run();
        await db.prepare("ALTER TABLE IndividualBookings RENAME COLUMN amount_refunded_inr TO amount_refunded_rupees").run();
      }

      // Subscriptions
      const subInfo2 = await db.prepare("PRAGMA table_info(Subscriptions)").all() as any;
      const sCols = (subInfo2.results || []).map((c: any) => c.name);
      if (sCols.includes('live_class_amount_inr') && !sCols.includes('live_class_amount_rupees')) {
        await db.prepare("ALTER TABLE Subscriptions RENAME COLUMN live_class_amount_inr TO live_class_amount_rupees").run();
      }
      if (sCols.includes('lifetime_price_inr') && !sCols.includes('lifetime_price_rupees')) {
        await db.prepare("ALTER TABLE Subscriptions RENAME COLUMN lifetime_price_inr TO lifetime_price_rupees").run();
      }

      // SubscriptionPlans
      const plansInfo2 = await db.prepare("PRAGMA table_info(SubscriptionPlans)").all() as any;
      const pCols = (plansInfo2.results || []).map((c: any) => c.name);
      if (pCols.includes('live_class_amount_inr') && !pCols.includes('live_class_amount_rupees')) {
        await db.prepare("ALTER TABLE SubscriptionPlans RENAME COLUMN live_class_amount_inr TO live_class_amount_rupees").run();
      }

      await markMigrationApplied(db, 'v006_rename_inr_to_rupees');
      logs += '[Auto-Migration] v006: Done\n';
    } catch (e) {
      const err = `[Auto-Migration] Error v006: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }

  // Tracked migration: drop dead credit-type columns and CreditPlans table
  if (!(await isMigrationApplied(db, 'v007_drop_dead_credit_columns'))) {
    try {
      const msg = '[Auto-Migration] v007: Dropping dead credit-type columns and CreditPlans table...';
      console.log(msg);
      logs += msg + '\n';

      async function dropColumnIfExist(table: string, column: string) {
        try {
          const info = await db.prepare(`PRAGMA table_info(${table})`).all() as any;
          if ((info.results || []).some((c: any) => c.name === column)) {
            await db.prepare(`ALTER TABLE ${table} DROP COLUMN ${column}`).run();
            logs += `[Auto-Migration] v007: Dropped ${table}.${column}\n`;
          }
        } catch (e) {
          logs += `[Auto-Migration] v007: Skip ${table}.${column} — ${e}\n`;
        }
      }

      // CreditWallets: drop dead split-credit columns
      await dropColumnIfExist('CreditWallets', 'ai_balance');
      await dropColumnIfExist('CreditWallets', 'live_class_balance');
      await dropColumnIfExist('CreditWallets', 'self_study_balance');
      await dropColumnIfExist('CreditWallets', 'lifetime_ai_credits');
      await dropColumnIfExist('CreditWallets', 'lifetime_live_class_credits');
      await dropColumnIfExist('CreditWallets', 'lifetime_self_study_credits');

      // CreditLedger: drop old INTEGER columns and credit_type
      await dropColumnIfExist('CreditLedger', 'change_amount');
      await dropColumnIfExist('CreditLedger', 'balance_after');
      await dropColumnIfExist('CreditLedger', 'credit_type');

      // CreditPacks: drop credit_type
      await dropColumnIfExist('CreditPacks', 'credit_type');

      // Drop CreditPlans table (dead — replaced by CreditPacks)
      try {
        await db.prepare("DROP TABLE IF EXISTS CreditPlans").run();
        logs += '[Auto-Migration] v007: Dropped CreditPlans table\n';
      } catch (e) {
        logs += `[Auto-Migration] v007: Skip CreditPlans drop — ${e}\n`;
      }

      await markMigrationApplied(db, 'v007_drop_dead_credit_columns');
      logs += '[Auto-Migration] v007: Done\n';
    } catch (e) {
      const err = `[Auto-Migration] Error v007: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }

  if (!(await isMigrationApplied(db, 'v008_index_anonymous_users_device_id'))) {
    try {
      const msg = '[Auto-Migration] v008: Adding idx_anonymous_users_device_id index...';
      console.log(msg);
      logs += msg + '\n';

      await db.prepare("CREATE INDEX IF NOT EXISTS idx_anonymous_users_device_id ON AnonymousUsers(device_id)").run();

      await markMigrationApplied(db, 'v008_index_anonymous_users_device_id');
      logs += '[Auto-Migration] v008: Done\n';
    } catch (e) {
      const err = `[Auto-Migration] Error v008: ${e}`;
      console.error(err);
      logs += err + '\n';
    }
  }

  // Clean up _OLD-style tables left behind by earlier manual migrations or schema recreates
  try {
    const oldTables = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%[_]OLD'"
    ).all() as any;
    if (oldTables.results && oldTables.results.length > 0) {
      for (const row of oldTables.results) {
        const tbl = row.name as string;
        await db.prepare(`DROP TABLE IF EXISTS "${tbl}"`).run();
        const msg = `[Auto-Migration] Cleaned up stale table: ${tbl}`;
        console.log(msg);
        logs += msg + '\n';
      }
    }
  } catch (e) {
    const err = `[Auto-Migration] Error cleaning up _OLD tables: ${e}`;
    console.error(err);
    logs += err + '\n';
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

function extractReferencedTables(triggerSql: string, triggerTable: string): string[] {
  const tables = new Set<string>();
  const pattern = /(?:FROM|UPDATE|DELETE\s+FROM|INSERT\s+(?:OR\s+\w+\s+)?INTO)\s+(\w+)/gi;
  let match;
  while ((match = pattern.exec(triggerSql)) !== null) {
    const tbl = match[1];
    if (tbl !== triggerTable && tbl !== 'OLD' && tbl !== 'NEW') {
      tables.add(tbl);
    }
  }
  return [...tables];
}

export async function importDatabaseFromJson(db: D1Database, jsonDump: string, skipOldTables = false): Promise<{ success: true; skipped: string[] } | { success: false; errors: { table: string; reason: string }[]; skipped: string[] }> {
  const errors: { table: string; reason: string }[] = [];
  const skipped: string[] = [];

  try {
    const dumpData = JSON.parse(jsonDump);

    const existingResult = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any;
    const existingTables = new Set<string>((existingResult.results || []).map((r: any) => r.name));

    // Drop triggers that reference non-existent tables (e.g. _OLD migration artifacts)
    const triggersResult = await db.prepare("SELECT name, sql, tbl_name FROM sqlite_master WHERE type='trigger'").all() as any;
    for (const trigger of (triggersResult.results || [])) {
      const refs = extractReferencedTables(trigger.sql || '', trigger.tbl_name);
      const brokenRefs = refs.filter(t => !existingTables.has(t));
      if (brokenRefs.length > 0) {
        await db.prepare(`DROP TRIGGER IF EXISTS "${trigger.name}"`).run();
        console.log(`[Restore] Dropped broken trigger "${trigger.name}" (references: ${brokenRefs.join(', ')})`);
      }
    }

    // Build a combined schema from all table schemas in the dump for topological sort
    const allSchemaSql = Object.entries(dumpData)
      .filter(([name]) => name !== 'sqlite_sequence' && name !== '_cf_KV')
      .map(([, data]) => {
        if (data && typeof data === 'object' && 'schema' in data) return (data as any).schema || '';
        return '';
      })
      .filter(Boolean)
      .join(';\n');
    const sortedTableNames = allSchemaSql ? getTopologicallySortedTables(allSchemaSql) : Object.keys(dumpData);
    const nameOrder = new Map(sortedTableNames.map((name, i) => [name, i]));
    const sortedEntries = Object.entries(dumpData).sort(([a], [b]) => (nameOrder.get(a) || 0) - (nameOrder.get(b) || 0));

    for (const [tableName, tableData] of sortedEntries) {
      if (tableName === 'sqlite_sequence' || tableName === '_cf_KV') continue;
      if (skipOldTables && /_OLD$/i.test(tableName)) {
        skipped.push(tableName);
        continue;
      }

      let rows: any[] = [];
      let schemaSql: string | undefined;

      if (Array.isArray(tableData)) {
        rows = tableData;
      } else if (tableData && typeof tableData === 'object') {
        const td = tableData as any;
        if ('rows' in td) rows = Array.isArray(td.rows) ? td.rows : [];
        if ('schema' in td) schemaSql = td.schema;
      }

      try {
        if (schemaSql) {
          const safeSql = schemaSql.replace(/^CREATE\s+TABLE/i, 'CREATE TABLE IF NOT EXISTS');
          await db.prepare(safeSql).run();
        }

        const checkResult = await db.prepare("SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name=?").bind(tableName).all() as any;
        const exists = (checkResult.results?.[0]?.cnt ?? 0) > 0;
        if (!exists) {
          skipped.push(tableName);
          continue;
        }

        const stagingTable = `_staging_${tableName}`;
        await db.prepare(`DROP TABLE IF EXISTS ${stagingTable}`).run();
        await db.prepare(`CREATE TABLE ${stagingTable} AS SELECT * FROM ${tableName} WHERE 0`).run();

        const insertStatements: any[] = [];
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map(() => '?').join(', ');
          insertStatements.push(db.prepare(`INSERT INTO ${stagingTable} (${columns.join(', ')}) VALUES (${placeholders})`).bind(...values));
        }

        for (let i = 0; i < insertStatements.length; i += 100) {
          await db.batch(insertStatements.slice(i, i + 100));
        }

        await db.batch([
          db.prepare(`DELETE FROM ${tableName}`),
          db.prepare(`INSERT INTO ${tableName} SELECT * FROM ${stagingTable}`),
          db.prepare(`DROP TABLE ${stagingTable}`)
        ]);

      } catch (e: any) {
        errors.push({ table: tableName, reason: e.message || String(e) });
        try {
          await db.prepare(`DROP TABLE IF EXISTS _staging_${tableName}`).run();
        } catch (cleanupErr) {}
      }
    }

    if (errors.length > 0) {
      return { success: false, errors, skipped };
    }
    return { success: true, skipped };
  } catch (e: any) {
    return { success: false, errors: [{ table: '(function)', reason: e.message || String(e) }], skipped };
  }
}
