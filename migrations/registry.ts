import SQL_0026_PERF from './0026_performance_indexes.sql';
import SQL_0027_PENDING_CHARGES_IDX from './0027_create_pending_charges_index.sql';
import SQL_0029_RESTORE_METADATA from './0029_add_restore_metadata_columns.sql';
import SQL_0030_FIX_EXAMS_OLD_FK from './0030_fix_exams_old_fk.sql';
import SQL_0031_REMOVE_OPENAI from './0005_remove_openai_models.sql';
import SQL_0032_ADD_RATE_LIMITS from './0032_add_rate_limits_table.sql';
import SQL_0033_ADD_SEO_COLUMNS from './0033_add_seo_columns.sql';
import SQL_0034_KV_BACKUPS from './0034_add_kv_backups_table.sql';
import SQL_0035_FIX_SUBSCRIPTION_AMOUNT from './0035_fix_subscription_amount_to_rupees.sql';
import SQL_0036_ENROLLMENT_PENDING_STATUS from './0036_add_pending_to_enrollment_check.sql';
import SQL_0037_FIX_SUBSCRIPTION_AMOUNT from './0037_fix_double_migrated_subscription_amount.sql';
import SQL_0038_DROP_AI_CREDITS_ADD_WALLET_TOPUP from './0038_drop_ai_credits_add_wallet_topup.sql';
import SQL_0040_SUBSCRIPTION_CANCELLATION from './0040_add_subscription_cancellation_flag.sql';
import SQL_0041_ADD_LIVE_CLASS_CHARGE_LOCKS from './0041_add_live_class_charge_locks.sql';
import SQL_0042_ADD_PER_MINUTE_LIVE_CREDIT from './0042_add_per_minute_live_credit_rate.sql';
import SQL_0043_ADD_INTEGER_PAISE_COLUMNS from './0043_add_integer_paise_columns.sql';
import SQL_0044_ADD_PAISE_TO_INDIVIDUAL_BOOKINGS from './0044_add_paise_to_individual_bookings.sql';
import SQL_0045_RECONCILE_RUPEES_FROM_PAISE from './0045_reconcile_rupees_from_paise.sql';
import SQL_0046_ADD_REMAINING_PAISE_COLUMNS from './0046_add_remaining_paise_columns.sql';
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
import SQL_0018 from './0018_add_performance_indexes.sql';
import SQL_0019 from './0019_add_enrollments_unique_constraint.sql';
import SQL_0020 from './0020_session_leave_system.sql';
import SQL_0021 from './0021_add_missing_user_and_lesson_columns.sql';
import SQL_0022 from './0022_add_performance_indexes.sql';
import SQL_0023 from './0023_add_notifications_index.sql';
import SQL_0024 from './0024_add_auth_and_txn_indexes.sql';
import SQL_0025 from './0025_add_student_id_to_users.sql';
import SQL_INDIVIDUAL_CLASS_SCHEDULING from './0018_individual_class_scheduling.sql';

export interface SqlMigration {
  id: string;       // e.g. "sql_0001"
  version: number;  // e.g. 1
  filename: string;
  sql: string;
}

import v_user_events_1 from "./v_user_events_1.sql";

export const SQL_MIGRATIONS: SqlMigration[] = [
  { id: 'sql_1000', version: 1000, filename: "v_user_events_1.sql", sql: v_user_events_1 },
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
  { id: 'sql_0018', version: 18,  filename: '0018_add_performance_indexes.sql',                    sql: SQL_0018 },
  { id: 'sql_0019', version: 19,  filename: '0019_add_enrollments_unique_constraint.sql',           sql: SQL_0019 },
  { id: 'sql_0020', version: 20,  filename: '0020_session_leave_system.sql',                        sql: SQL_0020 },
  { id: 'sql_0021', version: 21,  filename: '0021_add_missing_user_and_lesson_columns.sql',         sql: SQL_0021 },
  { id: 'sql_0022', version: 22,  filename: '0022_add_performance_indexes.sql',                      sql: SQL_0022 },
  { id: 'sql_0023', version: 23,  filename: '0023_add_notifications_index.sql',                      sql: SQL_0023 },
  { id: 'sql_0024', version: 24,  filename: '0024_add_auth_and_txn_indexes.sql',                     sql: SQL_0024 },
  // NOTE: sql_0025 applies 0018_individual_class_scheduling.sql — added out-of-order at registry position 25.
  // The id 'sql_0025' is stored in the _migrations table; do NOT change it.
  { id: 'sql_0025', version: 25,  filename: '0018_individual_class_scheduling.sql',  sql: SQL_INDIVIDUAL_CLASS_SCHEDULING },
  // NOTE: sql_0026 applies 0025_add_student_id_to_users.sql — added out-of-order at registry position 26.
  // The id 'sql_0026' is stored in the _migrations table; do NOT change it.
  { id: 'sql_0026', version: 26,  filename: '0025_add_student_id_to_users.sql',       sql: SQL_0025 },
  { id: 'sql_0027', version: 27,  filename: '0026_performance_indexes.sql',       sql: SQL_0026_PERF },
  { id: 'sql_0028', version: 28,  filename: '0027_create_pending_charges_index.sql', sql: SQL_0027_PENDING_CHARGES_IDX },
  { id: 'sql_0029', version: 29,  filename: '0029_add_restore_metadata_columns.sql', sql: SQL_0029_RESTORE_METADATA },
  { id: 'sql_0030', version: 30,  filename: '0030_fix_exams_old_fk.sql',             sql: SQL_0030_FIX_EXAMS_OLD_FK },
  { id: 'sql_0031', version: 31,  filename: '0005_remove_openai_models.sql',         sql: SQL_0031_REMOVE_OPENAI },
  { id: 'sql_0032', version: 32,  filename: '0032_add_rate_limits_table.sql',        sql: SQL_0032_ADD_RATE_LIMITS },
  { id: 'sql_0033', version: 33,  filename: '0033_add_seo_columns.sql',                 sql: SQL_0033_ADD_SEO_COLUMNS },
  { id: 'sql_0034', version: 34,  filename: '0034_add_kv_backups_table.sql',             sql: SQL_0034_KV_BACKUPS },
  { id: 'sql_0035', version: 35,  filename: '0035_fix_subscription_amount_to_rupees.sql', sql: SQL_0035_FIX_SUBSCRIPTION_AMOUNT },
  { id: 'sql_0036', version: 36,  filename: '0036_add_pending_to_enrollment_check.sql',    sql: SQL_0036_ENROLLMENT_PENDING_STATUS },
  { id: 'sql_0037', version: 37,  filename: '0037_fix_double_migrated_subscription_amount.sql', sql: SQL_0037_FIX_SUBSCRIPTION_AMOUNT },
  { id: 'sql_0038', version: 38,  filename: '0038_drop_ai_credits_add_wallet_topup.sql', sql: SQL_0038_DROP_AI_CREDITS_ADD_WALLET_TOPUP },
  { id: 'sql_0040', version: 39,  filename: '0040_add_subscription_cancellation_flag.sql', sql: SQL_0040_SUBSCRIPTION_CANCELLATION },
  { id: 'sql_0041', version: 40,  filename: '0041_add_live_class_charge_locks.sql',      sql: SQL_0041_ADD_LIVE_CLASS_CHARGE_LOCKS },
  { id: 'sql_0042', version: 41,  filename: '0042_add_per_minute_live_credit_rate.sql',     sql: SQL_0042_ADD_PER_MINUTE_LIVE_CREDIT },
  { id: 'sql_0043', version: 42,  filename: '0043_add_integer_paise_columns.sql',              sql: SQL_0043_ADD_INTEGER_PAISE_COLUMNS },
  { id: 'sql_0044', version: 43,  filename: '0044_add_paise_to_individual_bookings.sql', sql: SQL_0044_ADD_PAISE_TO_INDIVIDUAL_BOOKINGS },
  { id: 'sql_0045', version: 44,  filename: '0045_reconcile_rupees_from_paise.sql',      sql: SQL_0045_RECONCILE_RUPEES_FROM_PAISE },
  { id: 'sql_0046', version: 45,  filename: '0046_add_remaining_paise_columns.sql',  sql: SQL_0046_ADD_REMAINING_PAISE_COLUMNS },
  { id: 'sql_0047', version: 46,  filename: '0046_add_remaining_paise_columns.sql',  sql: SQL_0047_RECONCILE_PAISE_FROM_RUPEES },
].sort((a, b) => a.version - b.version);
