-- 125_update_order_rpcs_for_deals.sql
-- Update order creation RPCs to support Deal unpacking

-- Ensure order_items has is_deal column
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_deal BOOLEAN DEFAULT false;

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
        -- 1. Insert the main item (or the Deal parent)
        INSERT INTO order_items (
            order_id,
            menu_item_id,
            deal_id,         -- Added for Deals
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
            is_deal          -- Optional but helpful if added to schema, otherwise we use deal_id check
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
                    parent_item_id, -- Link to deal
                    deal_id,        -- Inherit deal_id
                    quantity,
                    price_snapshot, -- Usually 0 or the adjustment
                    selected_modifiers,
                    name_snapshot,
                    station_id,
                    course
                ) VALUES (
                    v_order_id,
                    (v_selection->>'menu_item_id')::UUID,
                    v_parent_item_id,
                    (v_item->>'deal_id')::UUID,
                    (v_item->>'quantity')::INTEGER, -- Selection quantity follows parent
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

-- RPC to add items to an existing order (handles deals)
CREATE OR REPLACE FUNCTION add_items_to_order(
    p_order_id UUID,
    p_items JSONB,
    p_round_number INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_selection JSONB;
    v_parent_item_id UUID;
    v_restaurant_id UUID;
BEGIN
    SELECT restaurant_id INTO v_restaurant_id FROM orders WHERE id = p_order_id;
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
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
            course_name, -- Note: POSOrderPage uses course_name
            round_number,
            is_miscellaneous,
            custom_item_name,
            name_snapshot,
            station_id,
            is_deal
        ) VALUES (
            p_order_id,
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
            COALESCE(v_item->>'course_name', 'Main'),
            p_round_number,
            COALESCE((v_item->>'is_miscellaneous')::BOOLEAN, false),
            v_item->>'custom_item_name',
            v_item->>'name_snapshot',
            (v_item->>'station_id')::UUID,
            COALESCE((v_item->>'is_deal')::BOOLEAN, false)
        )
        RETURNING id INTO v_parent_item_id;

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
                    course_name,
                    round_number
                ) VALUES (
                    p_order_id,
                    (v_selection->>'menu_item_id')::UUID,
                    v_parent_item_id,
                    (v_item->>'deal_id')::UUID,
                    (v_item->>'quantity')::INTEGER,
                    COALESCE((v_selection->>'price_adjustment')::DECIMAL(10,2), 0),
                    COALESCE(v_selection->'modifiers', '[]'::jsonb),
                    v_selection->>'name',
                    (v_selection->>'station_id')::UUID,
                    COALESCE(v_item->>'course_name', 'Main'),
                    p_round_number
                );
            END LOOP;
        END IF;
    END LOOP;

    RETURN json_build_object('success', true);
END;
$$;
