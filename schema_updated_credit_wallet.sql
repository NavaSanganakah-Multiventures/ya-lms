-- ============================================================================
-- UNIFIED CREDIT WALLET SYSTEM
-- Merges Users.ai_credits + UserAICredits into single comprehensive table
-- ============================================================================

-- Drop old tables (backup first!)
-- DROP TABLE IF EXISTS UserAICredits;

-- ============================================================================
-- 1. CREDIT WALLET TABLE (Unified - replaces UserAICredits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS CreditWallet (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    
    -- Base Credits (from purchases)
    base_credits_total INTEGER DEFAULT 0,
    base_credits_used INTEGER DEFAULT 0,
    
    -- Bonus Credits (from promotions, referrals, etc)
    bonus_credits_total INTEGER DEFAULT 0,
    bonus_credits_used INTEGER DEFAULT 0,
    
    -- Calculated available credits
    available_credits INTEGER GENERATED ALWAYS AS (
        (base_credits_total - base_credits_used) + (bonus_credits_total - bonus_credits_used)
    ) STORED,
    
    -- Subscription linked to wallet
    subscription_id TEXT,
    subscription_plan TEXT CHECK(subscription_plan IN ('none', 'monthly', 'yearly', 'lifetime')) DEFAULT 'none',
    
    -- Period management for subscription credits
    credits_period TEXT DEFAULT 'none', -- 'monthly', 'yearly', 'lifetime', 'none'
    period_start DATETIME,
    period_end DATETIME,
    
    -- Rate limiting (per hour)
    hour_window_start DATETIME,
    hour_window_used INTEGER DEFAULT 0,
    rate_limit_per_hour INTEGER DEFAULT 0,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    
    -- Ensure one wallet per user
    CONSTRAINT unique_user_wallet UNIQUE(user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_credit_wallet_user ON CreditWallet(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_wallet_available ON CreditWallet(available_credits);
CREATE INDEX IF NOT EXISTS idx_credit_wallet_period ON CreditWallet(credits_period, period_end);
CREATE INDEX IF NOT EXISTS idx_credit_wallet_updated ON CreditWallet(updated_at);

-- ============================================================================
-- 2. CREDIT TRANSACTION LOG (Detailed transaction history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS CreditTransactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Transaction details
    transaction_type TEXT CHECK(transaction_type IN (
        'purchase',        -- User bought credits
        'bonus_added',     -- Admin added bonus
        'referral',        -- Earned from referral
        'refund',          -- Refund issued
        'deduction',       -- Credits used for service
        'expiry',          -- Credits expired
        'adjustment',      -- Admin adjustment
        'transfer'         -- Credits transferred
    )) NOT NULL,
    
    credit_type TEXT CHECK(credit_type IN ('base', 'bonus')) NOT NULL DEFAULT 'base',
    
    -- Amount
    credits_amount INTEGER NOT NULL,
    
    -- Reason / Description
    description TEXT,
    reason TEXT, -- 'ai_generation', 'course_purchase', 'class_joining', etc.
    
    -- Related records
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    transaction_id TEXT, -- Reference to Transactions table
    course_id TEXT,
    batch_id TEXT,
    
    -- Admin action tracking
    initiated_by TEXT, -- 'system', 'admin', 'user'
    admin_id TEXT,
    notes TEXT,
    
    -- Balance snapshot
    balance_before INTEGER,
    balance_after INTEGER,
    
    -- Status
    status TEXT CHECK(status IN ('pending', 'completed', 'failed', 'reversed')) DEFAULT 'completed',
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    
    FOREIGN KEY (wallet_id) REFERENCES CreditWallet(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE SET NULL,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- Indexes for transaction tracking
CREATE INDEX IF NOT EXISTS idx_credit_transactions_wallet ON CreditTransactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON CreditTransactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON CreditTransactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON CreditTransactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_status ON CreditTransactions(status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_payment ON CreditTransactions(razorpay_payment_id);

-- ============================================================================
-- 3. CREDIT USAGE LOG (For AI/Service usage tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS CreditUsageLogs (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- What was used
    service_type TEXT CHECK(service_type IN (
        'ai_content_generation',
        'ai_image_generation',
        'ai_video_generation',
        'course_self_study',
        'course_individual_class',
        'course_group_class',
        'other'
    )) NOT NULL,
    
    -- Credits consumed
    credits_deducted INTEGER NOT NULL,
    credit_source TEXT CHECK(credit_source IN ('base', 'bonus')) NOT NULL,
    
    -- Related records
    course_id TEXT,
    batch_id TEXT,
    session_id TEXT, -- For live classes
    lesson_id TEXT,
    ai_prompt TEXT,
    
    -- Details
    description TEXT,
    usage_details_json TEXT, -- JSON for additional metadata
    
    -- Timestamps
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (wallet_id) REFERENCES CreditWallet(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE SET NULL,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_usage_wallet ON CreditUsageLogs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user ON CreditUsageLogs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_service ON CreditUsageLogs(service_type);
CREATE INDEX IF NOT EXISTS idx_credit_usage_course ON CreditUsageLogs(course_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_time ON CreditUsageLogs(used_at);

-- ============================================================================
-- 4. CREDIT PLANS (Predefined packages)
-- ============================================================================
-- ALTER TABLE CreditPlans ADD COLUMN description TEXT;
-- ALTER TABLE CreditPlans ADD COLUMN credit_type TEXT DEFAULT 'base';
-- ALTER TABLE CreditPlans ADD COLUMN is_popular INTEGER DEFAULT 0;
-- ALTER TABLE CreditPlans ADD COLUMN valid_days INTEGER DEFAULT 365;

-- If table doesn't exist, create it with enhanced fields
CREATE TABLE IF NOT EXISTS CreditPlans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_inr INTEGER NOT NULL, -- in paise (e.g., 50000 for ₹500)
    price_usd INTEGER DEFAULT 0,
    
    description TEXT,
    credit_type TEXT CHECK(credit_type IN ('base', 'bonus')) DEFAULT 'base',
    
    is_popular INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    
    valid_days INTEGER DEFAULT 365, -- Credit expiry period
    display_order INTEGER DEFAULT 0,
    
    is_active INTEGER DEFAULT 1,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_plans_active ON CreditPlans(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_plans_featured ON CreditPlans(is_featured);

-- ============================================================================
-- 5. CREDIT EXPIRY TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS CreditExpirySchedule (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    credit_type TEXT CHECK(credit_type IN ('base', 'bonus')) NOT NULL,
    credits_expiring INTEGER NOT NULL,
    
    -- Original source
    source_transaction_id TEXT,
    
    -- Expiry info
    expiry_date DATETIME NOT NULL,
    is_expired INTEGER DEFAULT 0,
    expired_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (wallet_id) REFERENCES CreditWallet(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expiry_wallet ON CreditExpirySchedule(wallet_id);
CREATE INDEX IF NOT EXISTS idx_expiry_date ON CreditExpirySchedule(expiry_date);
CREATE INDEX IF NOT EXISTS idx_expiry_expired ON CreditExpirySchedule(is_expired);

-- ============================================================================
-- 6. MIGRATION SCRIPT - Populate from old tables
-- ============================================================================
-- Run this AFTER creating new tables to migrate existing data

-- Insert from Users.ai_credits to CreditWallet
INSERT INTO CreditWallet (
    id, user_id, base_credits_total, base_credits_used, 
    subscription_id, credits_period, created_at, updated_at
)
SELECT 
    'cw_' || Users.id,
    Users.id,
    COALESCE(Users.ai_credits, 0),
    0,
    NULL,
    'none',
    Users.created_at,
    CURRENT_TIMESTAMP
FROM Users
WHERE Users.id NOT IN (SELECT user_id FROM CreditWallet)
ON CONFLICT(user_id) DO NOTHING;

-- ============================================================================
-- 7. VIEWS FOR EASY QUERYING
-- ============================================================================

-- View: User Credit Summary
CREATE VIEW IF NOT EXISTS vw_user_credit_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    cw.id as wallet_id,
    cw.base_credits_total,
    cw.base_credits_used,
    (cw.base_credits_total - cw.base_credits_used) as base_available,
    cw.bonus_credits_total,
    cw.bonus_credits_used,
    (cw.bonus_credits_total - cw.bonus_credits_used) as bonus_available,
    cw.available_credits,
    cw.subscription_plan,
    cw.period_end,
    cw.updated_at
FROM Users u
LEFT JOIN CreditWallet cw ON u.id = cw.user_id;

-- View: Credit Usage Summary (by user)
CREATE VIEW IF NOT EXISTS vw_credit_usage_summary AS
SELECT 
    user_id,
    service_type,
    COUNT(*) as usage_count,
    SUM(credits_deducted) as total_credits_used,
    MIN(used_at) as first_use,
    MAX(used_at) as last_use
FROM CreditUsageLogs
GROUP BY user_id, service_type;

-- View: Recent Transactions
CREATE VIEW IF NOT EXISTS vw_recent_credit_transactions AS
SELECT 
    ct.id,
    ct.user_id,
    u.email,
    u.full_name,
    ct.transaction_type,
    ct.credit_type,
    ct.credits_amount,
    ct.description,
    ct.status,
    ct.balance_before,
    ct.balance_after,
    ct.created_at
FROM CreditTransactions ct
JOIN Users u ON ct.user_id = u.id
ORDER BY ct.created_at DESC;

-- ============================================================================
-- 8. TRIGGER - Auto-update CreditWallet.updated_at
-- ============================================================================
-- SQLite doesn't support triggers in the same way, but we can simulate with UPDATE statements
-- This would be better handled in application code with ON CONFLICT

-- ============================================================================
-- NOTES FOR MIGRATION:
-- ============================================================================
/*
1. BACKUP your database before running this!

2. Steps to migrate:
   a. Run this entire script to create new tables
   b. Run the migration script above (INSERT statements)
   c. Verify data in new CreditWallet table
   d. Update application code to use CreditWallet instead of Users.ai_credits
   e. Update queries to use CreditTransactions for audit trail
   f. Remove old UserAICredits table after verification
   g. Remove ai_credits column from Users table (after testing)

3. Key changes in application:
   - Use CreditWallet for all credit queries
   - Log ALL credit changes to CreditTransactions
   - Check available_credits (generated column) for display
   - Use CreditUsageLogs for analytics

4. Unique Constraints:
   - One wallet per user (UNIQUE on user_id)
   - Ensures no duplicate records for same user

5. Always log transactions for:
   - Audit trail
   - Dispute resolution
   - Analytics
   - Compliance
*/
