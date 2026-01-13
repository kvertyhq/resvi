-- 1. Enhance table_info for Visual Floor Plan
ALTER TABLE table_info 
ADD COLUMN IF NOT EXISTS x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS shape TEXT DEFAULT 'rectangle', -- 'rectangle', 'circle'
ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT 'Main Hall';

-- 2. Enhance orders for POS & Staff Tracking
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine_in', -- 'dine_in', 'collection', 'delivery'
ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES table_info(id),
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS is_pos BOOLEAN DEFAULT false;

-- 3. Enhance order_items for Course Management & KDS
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS course_name TEXT DEFAULT 'Main', -- 'Starter', 'Main', 'Dessert'
ADD COLUMN IF NOT EXISTS seat_number INTEGER,
ADD COLUMN IF NOT EXISTS fired_at TIMESTAMP WITH TIME ZONE;

-- 4. Enhance profiles for Staff PIN Login
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pin_code TEXT; -- Store hashed PIN

-- 5. Create staff_sessions for Clock In/Out
CREATE TABLE IF NOT EXISTS staff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurant_settings(id) NOT NULL,
    staff_id UUID REFERENCES profiles(id) NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE DEFAULT now(),
    clock_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for staff_sessions
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for authenticated users" ON staff_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. Enhance restaurant_settings for QR Ordering
ALTER TABLE restaurant_settings
ADD COLUMN IF NOT EXISTS enable_qr_ordering BOOLEAN DEFAULT false;

-- 7. Create call_logs for IVR Integration
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurant_settings(id) NOT NULL,
    caller_number TEXT NOT NULL,
    status TEXT DEFAULT 'missed', -- 'missed', 'answered', 'order_placed'
    duration INTEGER DEFAULT 0, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for call_logs
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON call_logs
    FOR ALL USING (auth.role() = 'authenticated');
