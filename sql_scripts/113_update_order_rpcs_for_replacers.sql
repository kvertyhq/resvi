-- Migration: Update create_walkin_order to support selected_replacers and excluded_toppings
-- This ensures that swaps and exclusions made in the POS are persisted to the database.

CREATE OR REPLACE FUNCTION create_walkin_order(
    p_restaurant_id UUID,
    p_staff_id UUID,
    p_order_items JSONB,
    p_total_amount DECIMAL(10,2),
    p_user_id UUID DEFAULT NULL,
    p_discount_type TEXT DEFAULT NULL,
    p_discount_amount DECIMAL(10,2) DEFAULT 0,
    p_payment_method TEXT DEFAULT NULL,
    p_payment_transaction_id TEXT DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_customer_address TEXT DEFAULT NULL,
    p_customer_postcode TEXT DEFAULT NULL,
    p_order_type TEXT DEFAULT 'dine_in',
    p_order_source order_source DEFAULT 'pos',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_result JSON;
    v_readable_order_id text;
    v_daily_order_number INTEGER;
BEGIN
    -- Validate inputs
    IF p_restaurant_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Restaurant ID is required');
    END IF;

    IF p_staff_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Staff ID is required');
    END IF;

    IF p_order_items IS NULL OR jsonb_array_length(p_order_items) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Order must contain at least one item');
    END IF;

    -- Create the order
    INSERT INTO orders (
        restaurant_id,
        user_id,
        staff_id,
        table_id,
        total_amount,
        status,
        payment_status,
        order_type,
        is_pos,
        discount_type,
        discount_amount,
        source,
        metadata,
        created_at
    ) VALUES (
        p_restaurant_id,
        p_user_id,
        p_staff_id,
        NULL,
        p_total_amount,
        CASE WHEN p_payment_method IS NOT NULL THEN 'confirmed'::order_status ELSE 'pending'::order_status END,
        CASE WHEN p_payment_method IS NOT NULL THEN 'paid'::payment_status ELSE 'unpaid'::payment_status END,
        p_order_type::order_type,
        true,
        p_discount_type,
        p_discount_amount,
        p_order_source::order_source,
        p_metadata,
        NOW()
    )
    RETURNING readable_id, id, daily_order_number INTO v_readable_order_id, v_order_id, v_daily_order_number;

    -- Insert order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
    LOOP
        INSERT INTO order_items (
            order_id,
            menu_item_id,
            quantity,
            price_snapshot,
            selected_modifiers,
            excluded_toppings,   -- Added
            selected_replacers,  -- Added
            notes,
            course,
            is_miscellaneous,
            custom_item_name,
            name_snapshot,
            station_id
        ) VALUES (
            v_order_id,
            CASE
                WHEN COALESCE((v_item->>'is_miscellaneous')::BOOLEAN, false) = true THEN NULL
                ELSE (v_item->>'menu_item_id')::UUID
            END,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price')::DECIMAL(10,2),
            COALESCE(v_item->'modifiers', '[]'::jsonb),
            COALESCE(v_item->'excluded_toppings', '[]'::jsonb),  -- Added
            COALESCE(v_item->'selected_replacers', '[]'::jsonb), -- Added
            v_item->>'notes',
            COALESCE(v_item->>'course', 'Main'),
            COALESCE((v_item->>'is_miscellaneous')::BOOLEAN, false),
            v_item->>'custom_item_name',
            v_item->>'name',
            (v_item->>'station_id')::UUID
        );
    END LOOP;

    -- Create payment record if payment was made
    IF p_payment_method IS NOT NULL THEN
        INSERT INTO payments (
            order_id,
            amount,
            payment_method,
            transaction_id,
            status,
            created_at
        ) VALUES (
            v_order_id,
            p_total_amount,
            p_payment_method::payment_method,
            p_payment_transaction_id,
            'paid',
            NOW()
        );
    END IF;

    v_result := json_build_object(
        'success', true,
        'order_id', v_readable_order_id,
        'order_uuid', v_order_id,
        'readable_id', v_readable_order_id,
        'daily_order_number', v_daily_order_number,
        'message', 'Walk-in order created successfully'
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION create_walkin_order TO authenticated;
GRANT EXECUTE ON FUNCTION create_walkin_order TO anon;
GRANT EXECUTE ON FUNCTION create_walkin_order TO service_role;

-- Update KDS RPC to include selected_replacers and excluded_toppings
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
                        'excluded_toppings', oi.excluded_toppings,
                        'selected_replacers', oi.selected_replacers, -- Added
                        'name_snapshot', oi.name_snapshot,
                        'station_id', COALESCE(oi.station_id, (
                            SELECT id 
                            FROM stations 
                            WHERE restaurant_id = o.restaurant_id 
                            AND is_default = true 
                            AND type = 'kitchen' 
                            LIMIT 1
                        )),
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

    RETURN coalesce(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_pos_kds_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_kds_orders(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_pos_kds_orders(UUID) TO service_role;
