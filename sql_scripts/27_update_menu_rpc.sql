CREATE OR REPLACE FUNCTION get_full_menu_grouped_by_category(
    p_restaurant_id UUID,
    p_available_only BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT jsonb_agg(cat_row) INTO result FROM (
        SELECT
            c.id,
            c.name,
            c.description,
            c.order_index,
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', mi.id,
                        'name', mi.name,
                        'description', mi.description,
                        'price', mi.price,
                        'is_available', mi.is_available,
                        'image_url', mi.image_url,
                        'tags', mi.tags,
                        'vegetarian', mi.vegetarian,
                        'spicy_level', mi.spicy_level
                    ) ORDER BY mi.name
                ) FILTER (WHERE mi.id IS NOT NULL), '[]'::jsonb
            ) AS menu_items
        FROM menu_categories c
        LEFT JOIN menu_items mi ON mi.category_id = c.id
            AND (NOT p_available_only OR mi.is_available = true)
        WHERE c.restaurant_id = p_restaurant_id
        GROUP BY c.id, c.name, c.description, c.order_index
        ORDER BY c.order_index, c.name
    ) AS cat_row;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
