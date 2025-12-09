-- Create delivery_zones table
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurant_settings(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  postcode_prefix TEXT NOT NULL,
  min_order_amount NUMERIC DEFAULT 0,
  max_order_amount NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookup by postcode prefix
CREATE INDEX IF NOT EXISTS idx_delivery_zones_postcode_prefix ON delivery_zones(postcode_prefix);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_restaurant_id ON delivery_zones(restaurant_id);

-- Enable RLS
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Policies (assuming public read, admin write pattern consistent with other tables)
CREATE POLICY "Allow public read access" ON delivery_zones
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert" ON delivery_zones
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON delivery_zones
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON delivery_zones
  FOR DELETE USING (auth.role() = 'authenticated');
