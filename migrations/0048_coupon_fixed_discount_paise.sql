-- Migration: 0048_coupon_fixed_discount_paise
-- #675: Coupons.discount_value is shared between 'percent' (raw %) and 'fixed' (amount).
-- The admin UI enters the fixed amount in RUPEES, but the backend applied it as PAISE,
-- so a Rs.50 fixed coupon only discounted 50 paise and displayed as Rs.0. The backend now
-- converts fixed discount_value rupees -> paise on create/update (paise stored).
-- This backfills existing 'fixed' coupons from rupees to paise (x100) so they match.
-- 'percent' coupons are untouched (discount_value is a percentage, not money).
UPDATE Coupons SET discount_value = discount_value * 100 WHERE discount_type = 'fixed';
