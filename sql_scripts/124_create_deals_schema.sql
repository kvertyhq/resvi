-- 124_create_deals_schema.sql
-- Create schema for Deals/Combos feature

-- 1. Create menu_deals table
CREATE TABLE IF NOT EXISTS menu_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurant_settings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fixed', 'percentage_discount', 'amount_discount')),
    price DECIMAL(10, 2), -- Used if pricing_type = 'fixed'
    discount_value DECIMAL(10, 2), -- Used for percentage or amount off
    is_available BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create menu_deal_groups table
CREATE TABLE IF NOT EXISTS menu_deal_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES menu_deals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_selection INTEGER DEFAULT 1,
    max_selection INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create menu_deal_group_options table
CREATE TABLE IF NOT EXISTS menu_deal_group_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_group_id UUID REFERENCES menu_deal_groups(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0,
    CHECK (
        (menu_item_id IS NOT NULL AND category_id IS NULL) OR
        (menu_item_id IS NULL AND category_id IS NOT NULL)
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Update order_items to support deal relationships
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES menu_deals(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE;

-- 5. Add RLS Policies
ALTER TABLE menu_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_deal_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_deal_group_options ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active deals
CREATE POLICY "Public can view active deals" ON menu_deals
    FOR SELECT USING (is_available = true);

CREATE POLICY "Public can view deal groups" ON menu_deal_groups
    FOR SELECT USING (true);

CREATE POLICY "Public can view deal group options" ON menu_deal_group_options
    FOR SELECT USING (true);

-- Admin full access (assuming supabase admin role or based on restaurant_id)
-- Note: Simplified policies for restaurant-based access if restaurant_id is in profile
CREATE POLICY "Admins have full access on menu_deals" ON menu_deals
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access on menu_deal_groups" ON menu_deal_groups
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access on menu_deal_group_options" ON menu_deal_group_options
    FOR ALL USING (auth.role() = 'authenticated');
