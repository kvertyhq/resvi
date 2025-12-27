-- Enable UUID extension if not enabled (usually is)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SMS Packages Table
CREATE TABLE IF NOT EXISTS sms_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'GBP',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
    
-- 2. Coupons Table
CREATE TYPE discount_type_enum AS ENUM ('percent', 'fixed');

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type discount_type_enum NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    max_uses INTEGER,
    valid_until TIMESTAMPTZ,
    restaurant_id UUID REFERENCES restaurant_settings(id), -- If NULL, available to all
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Restaurant Credits Table
CREATE TABLE IF NOT EXISTS restaurant_credits (
    restaurant_id UUID PRIMARY KEY REFERENCES restaurant_settings(id),
    balance INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Credit Transactions Table
CREATE TYPE credit_transaction_type AS ENUM ('purchase', 'bonus', 'adjustment', 'usage');

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurant_settings(id),
    package_id UUID REFERENCES sms_packages(id),
    amount DECIMAL(10, 2) DEFAULT 0, -- Money paid
    credits_added INTEGER NOT NULL, -- Can be negative for usage/adjustment
    transaction_type credit_transaction_type NOT NULL,
    stripe_payment_id TEXT,
    coupon_id UUID REFERENCES coupons(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SMS Logs Table (Linked to Notifications if possible, but distinct for billing)
-- Use this to show "where the SMSs are used"
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurant_settings(id),
    notification_id UUID, -- Optional link to notifications table
    provider_message_id TEXT, -- Twilio SID
    recipient TEXT,
    status TEXT, -- 'sent', 'delivered', 'failed'
    cost_in_credits INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES

-- sms_packages: Everyone can read active, Super Admin full control
ALTER TABLE sms_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active packages" 
ON sms_packages FOR SELECT 
TO authenticated 
USING (is_active = true);

CREATE POLICY "Super admin full access packages" 
ON sms_packages FOR ALL 
TO authenticated 
USING ((auth.jwt() ->> 'role') = 'super_admin');

-- coupons: Super Admin full control, Restaurant Admin read applicable
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access coupons" 
ON coupons FOR ALL 
TO authenticated 
USING ((auth.jwt() ->> 'role') = 'super_admin');

-- restaurant_credits: Read own, Super Admin all
ALTER TABLE restaurant_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant admin read own credits" 
ON restaurant_credits FOR SELECT 
TO authenticated 
USING (restaurant_id::text = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id'));

CREATE POLICY "Super admin read all credits" 
ON restaurant_credits FOR SELECT 
TO authenticated 
USING ((auth.jwt() ->> 'role') = 'super_admin');

-- credit_transactions: Read own, Super Admin all
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant admin read own transactions" 
ON credit_transactions FOR SELECT 
TO authenticated 
USING (restaurant_id::text = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id'));

CREATE POLICY "Super admin read all transactions" 
ON credit_transactions FOR SELECT 
TO authenticated 
USING ((auth.jwt() ->> 'role') = 'super_admin');

-- sms_logs: Read own, Super Admin all
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant admin read own logs" 
ON sms_logs FOR SELECT 
TO authenticated 
USING (restaurant_id::text = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id'));

CREATE POLICY "Super admin read all logs" 
ON sms_logs FOR SELECT 
TO authenticated 
USING ((auth.jwt() ->> 'role') = 'super_admin');

-- Triggers or Functions (Optional but good for data integrity)
-- Auto-create credit record when restaurant is created? 
-- (Handling that in application logic is fine for now)
