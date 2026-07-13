import "/app/migrations/globals.d.ts";
// Migration Registry — SQL files imported as Text via wrangler rules
// Each entry: { version: string, filename: string, sql: string }
// Auto-applied by the intelligent migration system in db-migrate.ts

import SQL_0001 from './0001_add-account-deletion-requests.sql';
import SQL_0002 from './0002_add_blocked_ips_table.sql';
import SQL_0003 from './0003_add_attempts_to_otps.sql';
import SQL_0004 from './0004_add_ai_models.sql';
import SQL_0005 from './0005_add_created_at_to_otps.sql';
import SQL_0006 from './0006_rename_group_class_to_live_class.sql';
import SQL_0007 from './0007_add_quiz_to_lessons.sql';
import SQL_0008 from './0008_fix_courses_wallet_rupees.sql';
import SQL_0009 from './0009_drop_credit_type_column.sql';
import SQL_0010 from './0010_populate_lifetime_withdrawals.sql';
import SQL_0011 from './0011_drop_remaining_old_columns.sql';
import SQL_0012 from './0012_add_push_subscriptions_indices.sql';
import SQL_0013 from './0013_add_live_session_indices.sql';
import SQL_0014 from './0014_drop_users_ai_credits.sql';
import SQL_0015 from './0015_migrate_courses_price.sql';
import SQL_0016 from './0016_recover_course_pricing.sql';
import SQL_0017 from './0017_add_course_index.sql';

export interface SqlMigration {
  id: string;       // e.g. "sql_0001"
  version: number;  // e.g. 1
  filename: string;
  sql: string;
}

export const SQL_MIGRATIONS: SqlMigration[] = [
  { id: 'sql_0001', version: 1,   filename: '0001_add-account-deletion-requests.sql',        sql: SQL_0001 },
  { id: 'sql_0002', version: 2,   filename: '0002_add_blocked_ips_table.sql',                  sql: SQL_0002 },
  { id: 'sql_0003', version: 3,   filename: '0003_add_attempts_to_otps.sql',                   sql: SQL_0003 },
  { id: 'sql_0004', version: 4,   filename: '0004_add_ai_models.sql',                          sql: SQL_0004 },
  { id: 'sql_0005', version: 5,   filename: '0005_add_created_at_to_otps.sql',                 sql: SQL_0005 },
  { id: 'sql_0006', version: 6,   filename: '0006_rename_group_class_to_live_class.sql',       sql: SQL_0006 },
  { id: 'sql_0007', version: 7,   filename: '0007_add_quiz_to_lessons.sql',                    sql: SQL_0007 },
  { id: 'sql_0008', version: 8,   filename: '0008_fix_courses_wallet_rupees.sql',              sql: SQL_0008 },
  { id: 'sql_0009', version: 9,   filename: '0009_drop_credit_type_column.sql',                sql: SQL_0009 },
  { id: 'sql_0010', version: 10,  filename: '0010_populate_lifetime_withdrawals.sql',          sql: SQL_0010 },
  { id: 'sql_0011', version: 11,  filename: '0011_drop_remaining_old_columns.sql',             sql: SQL_0011 },
  { id: 'sql_0012', version: 12,  filename: '0012_add_push_subscriptions_indices.sql',         sql: SQL_0012 },
  { id: 'sql_0013', version: 13,  filename: '0013_add_live_session_indices.sql',               sql: SQL_0013 },
  { id: 'sql_0014', version: 14,  filename: '0014_drop_users_ai_credits.sql',                   sql: SQL_0014 },
  { id: 'sql_0015', version: 15,  filename: '0015_migrate_courses_price.sql',                   sql: SQL_0015 },
  { id: 'sql_0016', version: 16,  filename: '0016_recover_course_pricing.sql',                  sql: SQL_0016 },
  { id: 'sql_0017', version: 17,  filename: '0017_add_course_index.sql',                          sql: SQL_0017 },
].sort((a, b) => a.version - b.version);
