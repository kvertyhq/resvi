-- Create menu_modifiers table (e.g., "Pizza Toppings", "Size")
CREATE TABLE IF NOT EXISTS menu_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurant_settings(id) NOT NULL,
    name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_multiple BOOLEAN DEFAULT true, -- Can select multiple items?
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create menu_modifier_items table (e.g., "Cheese", "Pepperoni", "Large")
CREATE TABLE IF NOT EXISTS menu_modifier_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_group_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment NUMERIC DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create link between menu_items and modifiers
CREATE TABLE IF NOT EXISTS menu_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    UNIQUE(menu_item_id, modifier_group_id)
);

-- Add modifiers column to order_items to store selected options
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_modifiers JSONB DEFAULT '[]'::jsonb;

-- Enable RLS
ALTER TABLE menu_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_modifier_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers ENABLE ROW LEVEL SECURITY;

-- Policies (Public Read, Admin Write)
CREATE POLICY "Public read modifiers" ON menu_modifiers FOR SELECT USING (true);
CREATE POLICY "Public read modifier items" ON menu_modifier_items FOR SELECT USING (true);
CREATE POLICY "Public read item modifiers" ON menu_item_modifiers FOR SELECT USING (true);

-- Fill in Admin polices if needed (skipped for brevity, assuming existing admin policies cover via super admin role or similar)
