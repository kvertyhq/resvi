-- Create link between menu_categories and modifiers
CREATE TABLE IF NOT EXISTS menu_category_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
    modifier_group_id UUID REFERENCES menu_modifiers(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    UNIQUE(category_id, modifier_group_id)
);

-- Enable RLS
ALTER TABLE menu_category_modifiers ENABLE ROW LEVEL SECURITY;

-- Policies (Public Read, Admin Write)
CREATE POLICY "Public read category modifiers" ON menu_category_modifiers FOR SELECT USING (true);
CREATE POLICY "Admin insert category modifiers" ON menu_category_modifiers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update category modifiers" ON menu_category_modifiers FOR UPDATE USING (true);
CREATE POLICY "Admin delete category modifiers" ON menu_category_modifiers FOR DELETE USING (true);
    