-- Migration 129: Fix create_walkin_order RPC to persist customer details
-- This restores the customer_name, customer_phone, customer_address, and customer_postcode fields
-- that were accidentally omitted in the previous migration (125).

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
    v_selection JSONB;
    v_parent_item_id UUID;
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
        customer_name,
        customer_phone,
        customer_address,
        customer_postcode,
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
        p_customer_name,
        p_customer_phone,
        p_customer_address,
        p_customer_postcode,
        NOW()
    )
    RETURNING readable_id, id, daily_order_number INTO v_readable_order_id, v_order_id, v_daily_order_number;

    -- Insert order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
    LOOP
        -- 1. Insert the main item (or the Deal parent)
        INSERT INTO order_items (
            order_id,
            menu_item_id,
            deal_id,
            quantity,
            price_snapshot,
            selected_modifiers,
            excluded_toppings,
            selected_replacers,
            notes,
            course,
            is_miscellaneous,
            custom_item_name,
            name_snapshot,
            station_id,
            is_deal
        ) VALUES (
            v_order_id,
            CASE
                WHEN COALESCE((v_item->>'is_deal')::BOOLEAN, false) = true THEN NULL
                WHEN COALESCE((v_item->>'is_miscellaneous')::BOOLEAN, false) = true THEN NULL
                ELSE (v_item->>'menu_item_id')::UUID
            END,
            (v_item->>'deal_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price')::DECIMAL(10,2),
            COALESCE(v_item->'modifiers', '[]'::jsonb),
            COALESCE(v_item->'excluded_toppings', '[]'::jsonb),
            COALESCE(v_item->'selected_replacers', '[]'::jsonb),
            v_item->>'notes',
            COALESCE(v_item->>'course', 'Main'),
            COALESCE((v_item->>'is_miscellaneous')::BOOLEAN, false),
            v_item->>'custom_item_name',
            v_item->>'name',
            (v_item->>'station_id')::UUID,
            COALESCE((v_item->>'is_deal')::BOOLEAN, false)
        )
        RETURNING id INTO v_parent_item_id;

        -- 2. If it's a deal, insert its selections
        IF COALESCE((v_item->>'is_deal')::BOOLEAN, false) = true AND v_item ? 'deal_selections' THEN
            FOR v_selection IN SELECT * FROM jsonb_array_elements(v_item->'deal_selections')
            LOOP
                INSERT INTO order_items (
                    order_id,
                    menu_item_id,
                    parent_item_id,
                    deal_id,
                    quantity,
                    price_snapshot,
                    selected_modifiers,
                    name_snapshot,
                    station_id,
                    course
                ) VALUES (
                    v_order_id,
                    (v_selection->>'menu_item_id')::UUID,
                    v_parent_item_id,
                    (v_item->>'deal_id')::UUID,
                    (v_item->>'quantity')::INTEGER,
                    COALESCE((v_selection->>'price_adjustment')::DECIMAL(10,2), 0),
                    COALESCE(v_selection->'modifiers', '[]'::jsonb),
                    v_selection->>'name',
                    (v_selection->>'station_id')::UUID,
                    COALESCE(v_item->>'course', 'Main')
                );
            END LOOP;
        END IF;
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
