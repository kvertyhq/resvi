    -- Update KDS RPC to include excluded_toppings in order items
    -- This allows the KDS to show what to remove or swap from a pizza

    CREATE OR REPLACE FUNCTION get_pos_kds_orders(p_restaurant_id UUID)
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
    result JSON;
    BEGIN
    SELECT json_agg(
        json_build_object(
        'id', o.id,
        'readable_id', o.readable_id,
        'daily_order_number', o.daily_order_number,
        'table_id', o.table_id,
        'status', o.status,
        'created_at', o.created_at,
        'order_type', o.order_type,
        'table_info', (
            SELECT json_build_object(
            'table_name', t.table_name
            ) 
            FROM table_info t 
            WHERE t.id = o.table_id
        ),
        'order_items', (
            SELECT coalesce(json_agg(
            json_build_object(
                'id', oi.id,
                'quantity', oi.quantity,
                'notes', oi.notes,
                'course_name', oi.course_name,
                'selected_modifiers', oi.selected_modifiers,
                'excluded_toppings', oi.excluded_toppings, -- Added this
                'name_snapshot', oi.name_snapshot,
            'station_id', COALESCE(oi.station_id, (
                SELECT id 
                FROM stations 
                WHERE restaurant_id = o.restaurant_id 
                AND is_default = true 
                AND type = 'kitchen' 
                LIMIT 1
            )), -- Fallback to default KITCHEN if null
            'menu_items', (
                SELECT json_build_object(
                    'name', mi.name,
                    'category_id', mi.category_id
                )
                FROM menu_items mi
                WHERE mi.id = oi.menu_item_id
                )
            )
            ), '[]'::json)
            FROM order_items oi
            WHERE oi.order_id = o.id
        )
        ) ORDER BY o.created_at ASC
    ) INTO result
    FROM orders o
    WHERE o.restaurant_id = p_restaurant_id
    AND o.status IN ('pending', 'confirmed', 'preparing', 'ready');

    -- Return empty array if null
    RETURN coalesce(result, '[]'::json);
    END;
    $$;

    GRANT EXECUTE ON FUNCTION get_pos_kds_orders(UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION get_pos_kds_orders(UUID) TO anon;
    GRANT EXECUTE ON FUNCTION get_pos_kds_orders(UUID) TO service_role;
