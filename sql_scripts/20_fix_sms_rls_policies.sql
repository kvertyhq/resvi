-- Helper Function: Check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql security definer
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$;

-- Helper Function: Get user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_my_restaurant_id()
RETURNS UUID
LANGUAGE plpgsql security definer
AS $$
DECLARE
  v_rid UUID;
BEGIN
  SELECT restaurant_id INTO v_rid
  FROM profiles
  WHERE id = auth.uid();
  RETURN v_rid;
END;
$$;


-- 1. FIX sms_packages POLICIES
DROP POLICY IF EXISTS "Super admin full access packages" ON sms_packages;
-- Also drop the public read one to be safe and recreate
DROP POLICY IF EXISTS "Allow public read active packages" ON sms_packages;

CREATE POLICY "Allow public read active packages" 
ON sms_packages FOR SELECT 
TO authenticated 
USING (is_active = true);

CREATE POLICY "Super admin full access packages" 
ON sms_packages FOR ALL 
TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


-- 2. FIX coupons POLICIES
DROP POLICY IF EXISTS "Super admin full access coupons" ON coupons;
DROP POLICY IF EXISTS "Restaurant admin read applicable coupons" ON coupons; -- If it exists (wasn't in 18 but might be needed)

CREATE POLICY "Super admin full access coupons" 
ON coupons FOR ALL 
TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Allow restaurants to read coupons that are global OR assigned to them
CREATE POLICY "Restaurant admin read coupons"
ON coupons FOR SELECT
TO authenticated
USING (
    restaurant_id IS NULL 
    OR 
    restaurant_id = public.get_my_restaurant_id()
);


-- 3. FIX restaurant_credits POLICIES
DROP POLICY IF EXISTS "Restaurant admin read own credits" ON restaurant_credits;
DROP POLICY IF EXISTS "Super admin read all credits" ON restaurant_credits;

CREATE POLICY "Restaurant admin read own credits" 
ON restaurant_credits FOR SELECT 
TO authenticated 
USING (restaurant_id = public.get_my_restaurant_id());

CREATE POLICY "Super admin read all credits" 
ON restaurant_credits FOR SELECT 
TO authenticated 
USING (public.is_super_admin());

-- Allow super admin to update/insert too (was missing in 18 for credits?)
CREATE POLICY "Super admin full access credits"
ON restaurant_credits FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


-- 4. FIX credit_transactions POLICIES
DROP POLICY IF EXISTS "Restaurant admin read own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Super admin read all transactions" ON credit_transactions;

CREATE POLICY "Restaurant admin read own transactions" 
ON credit_transactions FOR SELECT 
TO authenticated 
USING (restaurant_id = public.get_my_restaurant_id());

CREATE POLICY "Super admin read all transactions" 
ON credit_transactions FOR SELECT 
TO authenticated 
USING (public.is_super_admin());

-- Allow system/functions to insert (triggers usually bypass RLS if security definer, but good to have)
-- If we insert from client (bad practice for credits), we'd need a policy. 
-- But our Edge Functions use Service Role, which bypasses RLS.
-- Super Admin might manually add transactions via dashboard.
CREATE POLICY "Super admin insert transactions"
ON credit_transactions FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());


-- 5. FIX sms_logs POLICIES
DROP POLICY IF EXISTS "Restaurant admin read own logs" ON sms_logs;
DROP POLICY IF EXISTS "Super admin read all logs" ON sms_logs;

CREATE POLICY "Restaurant admin read own logs" 
ON sms_logs FOR SELECT 
TO authenticated 
USING (restaurant_id = public.get_my_restaurant_id());

CREATE POLICY "Super admin read all logs" 
ON sms_logs FOR SELECT 
TO authenticated 
USING (public.is_super_admin());
