-- Create table_info table
CREATE TABLE IF NOT EXISTS table_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    restaurant_id UUID NOT NULL, -- references restaurants(id) if that table exists, but enforcing text for now to be safe or assuming it exists
    table_name TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 4 -- Capacity
);

-- Enable RLS
ALTER TABLE table_info ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (or authenticated if strict)
-- For now allowing public read to fetch capacity on booking page
CREATE POLICY "Enable read access for all users" ON table_info
    FOR SELECT USING (true);

-- Insert sample data for the specific restaurant mentioned in the previous turn
-- restaurant_id: de0f9025-ed66-4dd5-bb30-5b23fe1891d7
INSERT INTO table_info (restaurant_id, table_name, count)
VALUES 
    ('de0f9025-ed66-4dd5-bb30-5b23fe1891d7', 'Table 1', 2),
    ('de0f9025-ed66-4dd5-bb30-5b23fe1891d7', 'Table 2', 4),
    ('de0f9025-ed66-4dd5-bb30-5b23fe1891d7', 'Table 3', 6),
    ('de0f9025-ed66-4dd5-bb30-5b23fe1891d7', 'Big Table', 10);
