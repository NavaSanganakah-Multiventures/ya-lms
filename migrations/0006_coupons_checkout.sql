-- Central checkout, billing address and coupon management.
CREATE TABLE IF NOT EXISTS Coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT,
    discount_type TEXT CHECK(discount_type IN ('percent','fixed')) NOT NULL DEFAULT 'percent',
    discount_value INTEGER NOT NULL DEFAULT 0,
    max_discount_paise INTEGER DEFAULT 0,
    min_order_paise INTEGER DEFAULT 0,
    applies_to_json TEXT DEFAULT '["all"]',
    target_ids_json TEXT DEFAULT '[]',
    allowed_emails_json TEXT DEFAULT '[]',
    excluded_emails_json TEXT DEFAULT '[]',
    usage_limit INTEGER,
    per_user_limit INTEGER DEFAULT 1,
    starts_at DATETIME,
    ends_at DATETIME,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS CouponRedemptions (
    id TEXT PRIMARY KEY,
    coupon_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT,
    transaction_id TEXT,
    discount_paise INTEGER DEFAULT 0,
    status TEXT DEFAULT 'created',
    redeemed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES Coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS BillingAddresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    transaction_id TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    line1 TEXT,
    line2 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    country TEXT DEFAULT 'India',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON Coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_user ON CouponRedemptions(coupon_id, user_id);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_user ON BillingAddresses(user_id);
