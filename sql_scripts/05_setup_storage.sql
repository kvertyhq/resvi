-- 1. Create the 'menus' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('menus', 'menus', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies for 'menus' bucket to avoid conflicts if re-running
DROP POLICY IF EXISTS "Public Access Menus" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Menus" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Menus" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Menus" ON storage.objects;

-- 3. Create new policies

-- Public Read Access: Anyone can view the menu PDF
CREATE POLICY "Public Access Menus"
ON storage.objects FOR SELECT
USING ( bucket_id = 'menus' );

-- Authenticated Insert: Admin (authenticated users) can upload
CREATE POLICY "Authenticated Upload Menus"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'menus' AND auth.role() = 'authenticated' );

-- Authenticated Update: Admin can update/overwrite
CREATE POLICY "Authenticated Update Menus"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'menus' AND auth.role() = 'authenticated' );

-- Authenticated Delete: Admin can remove the file
CREATE POLICY "Authenticated Delete Menus"
ON storage.objects FOR DELETE
USING ( bucket_id = 'menus' AND auth.role() = 'authenticated' );
