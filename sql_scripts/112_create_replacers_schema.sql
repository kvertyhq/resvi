-- Create menu_replacer_groups table (e.g., "Burger Swaps")
CREATE TABLE IF NOT EXISTS menu_replacer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurant_settings(id) NOT NULL,
    name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_multiple BOOLEAN DEFAULT true, -- Can select multiple swaps?
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create menu_replacer_items table (e.g., "Swap Mayo for Ham")
CREATE TABLE IF NOT EXISTS menu_replacer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    replacer_group_id UUID REFERENCES menu_replacer_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_modifier_item_id UUID REFERENCES menu_modifier_items(id) ON DELETE SET NULL, -- The ingredient that gets removed
    price_adjustment NUMERIC DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create link between menu_items and replacer groups
CREATE TABLE IF NOT EXISTS menu_item_replacers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    replacer_group_id UUID REFERENCES menu_replacer_groups(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    UNIQUE(menu_item_id, replacer_group_id)
);

-- Add replacers column to order_items to store selected swaps
-- (this might overlap with excluded_toppings logic, but it's good to keep track of what replacer id was chosen)
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_replacers JSONB DEFAULT '[]'::jsonb;

-- Enable RLS
ALTER TABLE menu_replacer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_replacer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_replacers ENABLE ROW LEVEL SECURITY;

-- Policies (Public Read, Admin Write via existing admin/super admin policies not shown here)
CREATE POLICY "Public read replacer groups" ON menu_replacer_groups FOR SELECT USING (true);
CREATE POLICY "Public read replacer items" ON menu_replacer_items FOR SELECT USING (true);
CREATE POLICY "Public read item replacers" ON menu_item_replacers FOR SELECT USING (true);

-- Allow super_admin and admins to manage
CREATE POLICY "Admin manage replacer groups" ON menu_replacer_groups 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (
                role = 'super_admin' 
                OR (role IN ('admin', 'super_admin', 'manager') AND restaurant_id = menu_replacer_groups.restaurant_id)
            )
        )
    );

CREATE POLICY "Admin manage replacer items" ON menu_replacer_items 
    USING (
        EXISTS (
            SELECT 1 FROM menu_replacer_groups g
            JOIN profiles p ON p.id = auth.uid()
            WHERE g.id = replacer_group_id
            AND (
                p.role = 'super_admin'
                OR (p.role IN ('admin', 'super_admin', 'manager') AND p.restaurant_id = g.restaurant_id)
            )
        )
    );

CREATE POLICY "Admin manage item replacers" ON menu_item_replacers 
    USING (
        EXISTS (
            SELECT 1 FROM menu_items mi
            JOIN profiles p ON p.id = auth.uid()
            WHERE mi.id = menu_item_id
            AND (
                p.role = 'super_admin'
                OR (p.role IN ('admin', 'super_admin', 'manager') AND p.restaurant_id = mi.restaurant_id)
            )
        )
    );
