-- Allow Super Admins to view all profiles
-- This is required for the dashboard to count staff/admins per restaurant

-- Ensure RLS is enabled on profiles (it should be, but good to ensure)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it conflicts or just create a new one
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;

CREATE POLICY "Super admins can view all profiles"
ON profiles FOR SELECT
USING (is_super_admin());
