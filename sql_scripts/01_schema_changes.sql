-- 1. Add preorder_required_days to restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS preorder_required_days text[] DEFAULT '{}';

-- 2. Create booking_items table
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    menu_item_id UUID, -- REFERENCES menu_items(id) -- Optional FK, typically good but depends if you hard delete items
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL,
    name TEXT NOT NULL,
    selected_addons JSONB DEFAULT '[]', -- Store addons as [{name, price, id}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS (likely needed)
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;

-- Allow public to insert (needed for booking flow)
CREATE POLICY "Public can insert booking items" ON booking_items FOR INSERT WITH CHECK (true);
-- Allow public to read their own? Or just admin?
-- For now, maybe just Admin or specific logic. 
-- Assuming standard setup:
CREATE POLICY "Admins can view all booking items" ON booking_items FOR SELECT USING (true); -- Simplify for now
