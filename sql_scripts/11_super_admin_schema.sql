-- 1. Enhance restaurant_settings to act as the main "Restaurant" record
-- It already has name, etc. We just need to ensure it has subscription info and SMS credits.

ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS sms_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic'; -- basic, pro, enterprise

-- 2. Update profiles to link to a restaurant
-- This implies a user belongs to ONE restaurant for now (simple multi-tenancy). 
-- Super Admins might have NULL restaurant_id or specific logic.
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurant_settings(id);

-- 3. Update profiles to have a role if not already present (it seems to have one from CustomerManagementPage)
-- distinct from the 'role' column which might just be 'admin' vs 'customer'. 
-- We need 'super_admin' support.
-- Existing 'role' column is text. We will standardize: 'super_admin', 'restaurant_admin', 'staff', 'customer'.

-- 4. Create SMS Credit Transactions table for audit trail
CREATE TABLE IF NOT EXISTS sms_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurant_settings(id) NOT NULL,
    amount INTEGER NOT NULL, -- positive for adding, negative for usage
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) -- Who triggered this (system or admin)
);

-- 5. Create Subscriptions table (Optional, for now we can verify simplified approach first)
-- If "subscription_plan" on restaurant_settings is enough, we skip a full table. 
-- Let's keep it simple: just the column on restaurant_settings is enough for "giving roles based on subscription".

-- 6. Policies (RLS)

-- Enable RLS on new tables
ALTER TABLE sms_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Super Admins can do everything
-- We need a way to check if current user is super admin.
-- Usually we check a claim or the profiles table.
-- Let's assume we use the profiles table 'role' column.

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _role text;
BEGIN
  SELECT role INTO _role FROM profiles WHERE id = auth.uid();
  RETURN _role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_restaurant_admin(target_restaurant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  _role text;
  _rid UUID;
BEGIN
  SELECT role, restaurant_id INTO _role, _rid FROM profiles WHERE id = auth.uid();
  RETURN (_role = 'restaurant_admin' OR _role = 'super_admin') AND (_rid = target_restaurant_id OR _role = 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for sms_credit_transactions
CREATE POLICY "Super admins can view all transactions" 
ON sms_credit_transactions FOR SELECT 
USING (is_super_admin());

CREATE POLICY "Restaurant admins can view their own transactions" 
ON sms_credit_transactions FOR SELECT 
USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

-- 7. Allow Super Admin to create restaurants (insert into restaurant_settings)
-- Currently restaurant_settings might be 1:1 with something else or just open.
-- Let's ensure RLS allows inserts by super admin.

CREATE POLICY "Super admins can insert restaurants" 
ON restaurant_settings FOR INSERT 
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update restaurants" 
ON restaurant_settings FOR UPDATE 
USING (is_super_admin());

-- 8. Add function to deduct credits securely
CREATE OR REPLACE FUNCTION deduct_sms_credit(p_restaurant_id UUID, p_amount INTEGER, p_description TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT sms_credits INTO current_credits FROM restaurant_settings WHERE id = p_restaurant_id;
  
  IF current_credits >= p_amount THEN
    UPDATE restaurant_settings SET sms_credits = sms_credits - p_amount WHERE id = p_restaurant_id;
    INSERT INTO sms_credit_transactions (restaurant_id, amount, description, created_by)
    VALUES (p_restaurant_id, -p_amount, p_description, auth.uid());
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
