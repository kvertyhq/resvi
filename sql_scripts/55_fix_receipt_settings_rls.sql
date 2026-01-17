-- Fix RLS policies for receipt_settings
-- The previous policy might be failing if role is not exactly 'admin' or if profiles RLS interferes.

DROP POLICY IF EXISTS "Admin full access to receipt_settings" ON receipt_settings;

-- Create a more inclusive policy
CREATE POLICY "Admin and Super Admin access receipt_settings"
ON receipt_settings FOR ALL
USING (
  -- Owner/Admin of the specific restaurant
  restaurant_id IN (
    SELECT restaurant_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner') -- Added 'owner' just in case
  )
  OR
  -- Super Admin (access to all)
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Ensure authenticated users have permissions
GRANT ALL ON receipt_settings TO authenticated;
