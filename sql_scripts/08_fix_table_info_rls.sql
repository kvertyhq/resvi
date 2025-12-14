-- Add RLS policies for table_info to allow editing

-- Allow authenticated users to INSERT
CREATE POLICY "Enable insert for authenticated users" ON table_info
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to UPDATE
CREATE POLICY "Enable update for authenticated users" ON table_info
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to DELETE
CREATE POLICY "Enable delete for authenticated users" ON table_info
    FOR DELETE USING (auth.role() = 'authenticated');
