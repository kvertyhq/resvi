-- 1. Create stations table
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurant_settings(id) NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('kitchen', 'bar', 'other')) DEFAULT 'kitchen',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON stations
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Create default stations for existing restaurants
-- Insert 'Kitchen' (default)
INSERT INTO stations (restaurant_id, name, type, is_default)
SELECT id, 'Kitchen', 'kitchen', true 
FROM restaurant_settings
WHERE NOT EXISTS (
    SELECT 1 FROM stations s WHERE s.restaurant_id = restaurant_settings.id AND s.type = 'kitchen'
);

-- Insert 'Bar'
INSERT INTO stations (restaurant_id, name, type, is_default)
SELECT id, 'Bar', 'bar', false 
FROM restaurant_settings
WHERE NOT EXISTS (
    SELECT 1 FROM stations s WHERE s.restaurant_id = restaurant_settings.id AND s.type = 'bar'
);

-- 4. Update menu_categories
ALTER TABLE menu_categories 
ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id);

-- Migrate existing text 'station' to 'station_id'
UPDATE menu_categories mc
SET station_id = s.id
FROM stations s
WHERE mc.restaurant_id = s.restaurant_id 
  AND LOWER(mc.station) = LOWER(s.type)
  AND mc.station_id IS NULL;

-- 5. Update menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id);

-- 6. Update order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id);

-- 7. Update view/RPC if necessary (Optional check)
-- Dropping cached views if they depend on * expansion and might break? Usually Postgres handles add column fine.
