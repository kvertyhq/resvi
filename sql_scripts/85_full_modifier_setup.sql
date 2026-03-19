-- Comprehensive Menu Modifiers Database Setup Script
-- This includes creating the tables, altering existing tables, and setting up all necessary RLS policies.

-- 1. Create Modifier Tables
CREATE TABLE IF NOT EXISTS menu_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurant_settings(id) NOT NULL,
    name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_multiple BOOLEAN DEFAULT true,
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_modifier_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_group_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment NUMERIC DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    UNIQUE(menu_item_id, modifier_group_id)
);

-- 2. Add structural columns to existing tables for advanced customization support
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_modifiers JSONB DEFAULT '[]'::jsonb;

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS price_variants JSONB DEFAULT '[]'::jsonb;

ALTER TABLE menu_modifier_items 
ADD COLUMN IF NOT EXISTS price_matrix JSONB DEFAULT '{}'::jsonb;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE menu_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_modifier_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow public (e.g. customers browsing menu) to read modifiers
CREATE POLICY "Public read modifiers" ON menu_modifiers FOR SELECT USING (true);
CREATE POLICY "Public read modifier items" ON menu_modifier_items FOR SELECT USING (true);
CREATE POLICY "Public read item modifiers" ON menu_item_modifiers FOR SELECT USING (true);

-- Allow authenticated users (e.g. Admins and Staff) to create, update, and delete modifiers
CREATE POLICY "Enable all access for authenticated users" ON menu_modifiers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON menu_modifier_items
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON menu_item_modifiers
    FOR ALL USING (auth.role() = 'authenticated');
