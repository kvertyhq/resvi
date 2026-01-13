-- Allow Admins to update other profiles (e.g. setting PINs/Roles)
-- Existing policies might only allow "update own profile"

DROP POLICY IF EXISTS "Admins can update restaurant profiles" ON profiles;

CREATE POLICY "Admins can update restaurant profiles"
ON profiles
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM profiles
    WHERE role = 'admin' OR role = 'super_admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles
    WHERE role = 'admin' OR role = 'super_admin'
  )
);
