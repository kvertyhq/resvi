-- Add INSERT permissions to profiles so POS can auto-create guest accounts
GRANT INSERT ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

CREATE POLICY "Enable insert for authenticated users"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (true);
