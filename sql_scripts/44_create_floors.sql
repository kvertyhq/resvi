-- 1. Create table for floors
CREATE TABLE IF NOT EXISTS restaurant_floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurant_settings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE restaurant_floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON restaurant_floors
    FOR ALL USING (auth.role() = 'authenticated');

-- 2. Add floor_id to table_info
ALTER TABLE table_info 
ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES restaurant_floors(id) ON DELETE SET NULL;

-- 3. Data Migration: Create floors from existing Zones
DO $$
DECLARE
    r RECORD;
    floor_record RECORD;
BEGIN
    -- Iterate over distinct restaurant/zone combinations that have tables
    FOR r IN 
        SELECT DISTINCT restaurant_id, zone 
        FROM table_info 
        WHERE zone IS NOT NULL AND restaurant_id IS NOT NULL
    LOOP
        -- specific check if floor already exists to avoid duplicates if re-run (though logic handles it mostly)
        INSERT INTO restaurant_floors (restaurant_id, name)
        VALUES (r.restaurant_id, r.zone)
        ON CONFLICT DO NOTHING -- No unique constraint usually on (restaurant_id, name) unless we add it, so let's check first
        RETURNING id INTO floor_record;
        
        -- If we didn't get an ID (because we didn't insert due to some logic, or just to be safe let's select it)
        -- Actually, simpliest way is to Insert if not exists, then select.
        
        -- Let's do a clean Insert-Select approach within the loop
        IF NOT EXISTS (SELECT 1 FROM restaurant_floors WHERE restaurant_id = r.restaurant_id AND name = r.zone) THEN
            INSERT INTO restaurant_floors (restaurant_id, name, order_index)
            VALUES (r.restaurant_id, r.zone, 0);
        END IF;

        -- Now update tables
        UPDATE table_info
        SET floor_id = (SELECT id FROM restaurant_floors WHERE restaurant_id = r.restaurant_id AND name = r.zone LIMIT 1)
        WHERE restaurant_id = r.restaurant_id AND zone = r.zone;
        
    END LOOP;
END $$;
