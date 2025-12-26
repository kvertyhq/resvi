-- 1. Add restaurant_id to menu_categories
ALTER TABLE menu_categories 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurant_settings(id);

CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);

-- 2. Add restaurant_id to menu_items
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurant_settings(id);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);

-- 3. Add restaurant_id to addon
ALTER TABLE addon
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurant_settings(id);

CREATE INDEX IF NOT EXISTS idx_addon_restaurant_id ON addon(restaurant_id);


-- 4. IMPORTANT: Update the get_full_menu RPC to filter by restaurant_id
-- We need to drop and recreate it to add the parameter
DROP FUNCTION IF EXISTS get_full_menu();
-- Also check if there's a version with parameter, if so we replace it. 
-- But typically we might need to overload or replace. Let's create a NEW strict version.

CREATE OR REPLACE FUNCTION get_full_menu(p_restaurant_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'name', c.name,
            'sort_order', c.sort_order,
            'items', (
                SELECT json_agg(
                    json_build_object(
                        'id', i.id,
                        'name', i.name,
                        'description', i.description,
                        'price', i.price,
                        'image_url', i.image_url,
                        'is_available', i.is_available,
                        'sort_order', i.sort_order,
                        'addon', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', ag.id,
                                    'name', ag.name,
                                    'min_selections', ag.min_selections,
                                    'max_selections', ag.max_selections,
                                    'addons', (
                                        SELECT json_agg(
                                            json_build_object(
                                                'id', a.id,
                                                'name', a.name,
                                                'price', a.price,
                                                'is_available', a.is_available
                                            )
                                        )
                                        FROM addons a
                                        WHERE a.group_id = ag.id
                                    )
                                )
                            )
                            FROM item_addons ia
                            JOIN addon ag ON ia.group_id = ag.id
                            WHERE ia.item_id = i.id
                        )
                    )
                    ORDER BY i.sort_order
                )
                FROM menu_items i
                WHERE i.category_id = c.id
                -- We assume items are linked to category, and category is linked to restaurant.
                -- However, strict filtering on items is good too if they share categories?
                -- For now, filtering categories by restaurant_id is key.
            )
        )
        ORDER BY c.sort_order
    ) INTO result
    FROM menu_categories c
    WHERE c.restaurant_id = p_restaurant_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
