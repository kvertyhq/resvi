-- 1. Ensure Users can view their own profile
-- This is critical for the AdminContext to load the user's role and restaurant_id
CREATE POLICY "Users can view own profile_v2"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 2. Backfill missing profiles
-- If a user exists in auth.users but not in public.profiles, we create a basic record.
-- This requires running as a superuser/postgres role in the SQL editor.
INSERT INTO public.profiles (id, full_name, role)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'System Admin'), 
    'admin' -- Defaulting to admin to ensure they can access the panel, adjust if needed
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 3. Grant basic permissions just in case
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
