-- Fix 403 Forbidden errors when creating/updating/deleting modifiers
-- This adds the necessary Row Level Security (RLS) policies to allow authenticated users to manage these tables.

CREATE POLICY "Enable all access for authenticated users" ON menu_modifiers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON menu_modifier_items
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON menu_item_modifiers
    FOR ALL USING (auth.role() = 'authenticated');
