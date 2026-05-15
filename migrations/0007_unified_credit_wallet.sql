-- ============================================================================
-- MIGRATION 0007: Unified Credit Wallet System
-- Merges UserAICredits + CreditWallets + CreditLedger into ONE system
-- Only CreditWallets + CreditLedger tables remain after this migration
--
-- NOTE: Ye migration AB AUTOMATIC hai - src/index.ts ke auto-migration
-- system mein integrated hai. Ye file sirf reference ke liye hai ya
-- manual fallback ke liye agar auto-migration fail kare.
-- ============================================================================

-- Step 1: Add new columns to CreditWallets for AI credit features
ALTER TABLE CreditWallets ADD COLUMN bonus_credits_total INTEGER DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN bonus_credits_used INTEGER DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN subscription_id TEXT;
ALTER TABLE CreditWallets ADD COLUMN credits_period TEXT DEFAULT 'none';
ALTER TABLE CreditWallets ADD COLUMN period_start DATETIME;
ALTER TABLE CreditWallets ADD COLUMN period_end DATETIME;
ALTER TABLE CreditWallets ADD COLUMN hour_window_start DATETIME;
ALTER TABLE CreditWallets ADD COLUMN hour_window_used INTEGER DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN rate_limit_per_hour INTEGER DEFAULT 0;

-- Step 2: Migrate UserAICredits data into CreditWallets (credit_type = 'ai')
INSERT OR IGNORE INTO CreditWallets (id, user_id, credit_type, total_credits, used_credits, locked_credits, bonus_credits_total, bonus_credits_used, subscription_id, credits_period, period_start, period_end, hour_window_start, hour_window_used, rate_limit_per_hour, created_at, updated_at)
SELECT 
  'cw_' || user_id || '_ai',
  user_id,
  'ai',
  CASE WHEN base_credits_total = -1 THEN 999999999 ELSE base_credits_total END,
  base_credits_used,
  0,
  bonus_credits_total,
  bonus_credits_used,
  subscription_id,
  COALESCE(credits_period, 'none'),
  period_start,
  period_end,
  hour_window_start,
  hour_window_used,
  rate_limit_per_hour,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM UserAICredits
WHERE user_id NOT IN (SELECT user_id FROM CreditWallets WHERE credit_type = 'ai');

-- Step 3: Update existing CreditWallets 'ai' rows with UserAICredits data
UPDATE CreditWallets 
SET 
  total_credits = (SELECT CASE WHEN ua.base_credits_total = -1 THEN 999999999 ELSE ua.base_credits_total END FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  used_credits = (SELECT ua.base_credits_used FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  bonus_credits_total = (SELECT ua.bonus_credits_total FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  bonus_credits_used = (SELECT ua.bonus_credits_used FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  subscription_id = (SELECT ua.subscription_id FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  credits_period = (SELECT COALESCE(ua.credits_period, 'none') FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  period_start = (SELECT ua.period_start FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  period_end = (SELECT ua.period_end FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  hour_window_start = (SELECT ua.hour_window_start FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  hour_window_used = (SELECT ua.hour_window_used FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id),
  rate_limit_per_hour = (SELECT ua.rate_limit_per_hour FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id)
WHERE credit_type = 'ai'
  AND EXISTS (SELECT 1 FROM UserAICredits ua WHERE ua.user_id = CreditWallets.user_id);

-- Step 4: Recreate CreditWallets with UNIQUE(user_id) instead of UNIQUE(user_id, credit_type)
-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we create new table
CREATE TABLE IF NOT EXISTS CreditWalletsNew (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credit_type TEXT NOT NULL DEFAULT 'self_study',
  total_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  locked_credits INTEGER DEFAULT 0,
  bonus_credits_total INTEGER DEFAULT 0,
  bonus_credits_used INTEGER DEFAULT 0,
  subscription_id TEXT,
  credits_period TEXT DEFAULT 'none',
  period_start DATETIME,
  period_end DATETIME,
  hour_window_start DATETIME,
  hour_window_used INTEGER DEFAULT 0,
  rate_limit_per_hour INTEGER DEFAULT 0,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id),
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Step 5: Merge data - for users with both 'self_study' and 'ai' rows, combine into one
INSERT OR REPLACE INTO CreditWalletsNew (id, user_id, credit_type, total_credits, used_credits, locked_credits, bonus_credits_total, bonus_credits_used, subscription_id, credits_period, period_start, period_end, hour_window_start, hour_window_used, rate_limit_per_hour, expires_at, created_at, updated_at)
SELECT
  'cw_' || user_id,
  user_id,
  'unified',
  MAX(total_credits),
  MAX(used_credits),
  MAX(locked_credits),
  MAX(COALESCE(bonus_credits_total, 0)),
  MAX(COALESCE(bonus_credits_used, 0)),
  MAX(subscription_id),
  MAX(COALESCE(credits_period, 'none')),
  MAX(period_start),
  MAX(period_end),
  MAX(hour_window_start),
  MAX(COALESCE(hour_window_used, 0)),
  MAX(COALESCE(rate_limit_per_hour, 0)),
  MAX(expires_at),
  MIN(created_at),
  CURRENT_TIMESTAMP
FROM CreditWallets
GROUP BY user_id;

-- Step 6: Drop old CreditWallets and rename new one
DROP TABLE IF EXISTS CreditWalletsOld;
ALTER TABLE CreditWallets RENAME TO CreditWalletsOld;
ALTER TABLE CreditWalletsNew RENAME TO CreditWallets;

-- Step 7: Drop UserAICredits table (data is now in CreditWallets)
DROP TABLE IF EXISTS UserAICredits;

-- Step 8: Recreate indexes on new CreditWallets
CREATE INDEX IF NOT EXISTS idx_credit_wallets_user ON CreditWallets(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_wallets_credit_type ON CreditWallets(credit_type);
CREATE INDEX IF NOT EXISTS idx_credit_wallets_subscription ON CreditWallets(subscription_id);
CREATE INDEX IF NOT EXISTS idx_credit_wallets_period ON CreditWallets(credits_period, period_end);

-- Step 9: Verify migration
SELECT 'Migration 0007 complete. Rows in CreditWallets: ' || COUNT(*) AS result FROM CreditWallets;
