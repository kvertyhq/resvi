-- Allow authenticated users (staff, admin) to update table_info
-- Previously we only checked Read/Insert maybe?

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON table_info;

CREATE POLICY "Enable update for authenticated users only"
ON table_info
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
