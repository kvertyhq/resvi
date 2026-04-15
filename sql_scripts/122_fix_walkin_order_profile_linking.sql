
-- Migration 122: Fix walk-in orders to link to profiles and improve receipt info
-- This version follows the normalized approach of using the profiles table
-- instead of adding extra columns to the orders table.

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
    v_user_final_id UUID := p_user_id;
    v_norm_phone TEXT;
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

    -- Normalize phone and resolve Profile
    v_norm_phone := nullif(regexp_replace(coalesce(p_customer_phone,''), '\D', '', 'g'), '');

    IF v_user_final_id IS NULL AND v_norm_phone IS NOT NULL THEN
        -- Try to find existing profile by normalized phone
        SELECT id INTO v_user_final_id
        FROM profiles
        WHERE regexp_replace(coalesce(phone,''), '\D', '', 'g') = v_norm_phone
        LIMIT 1;
        
        -- If not found, create new profile
        IF v_user_final_id IS NULL THEN
            INSERT INTO profiles (full_name, phone, created_at, updated_at)
            VALUES (COALESCE(p_customer_name, 'Guest'), p_customer_phone, NOW(), NOW())
            RETURNING id INTO v_user_final_id;
        END IF;
    ELSIF v_user_final_id IS NULL AND p_customer_name IS NOT NULL THEN
        -- If no phone but name provided, create minimal profile
        INSERT INTO profiles (full_name, created_at, updated_at)
        VALUES (p_customer_name, NOW(), NOW())
        RETURNING id INTO v_user_final_id;
    END IF;

    -- Create the order
    INSERT INTO orders (
        restaurant_id,
        user_id,            -- Now linked to the resolved/created profile
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
        customer_address,
        customer_postcode,
        created_at
    ) VALUES (
        p_restaurant_id,
        v_user_final_id,     -- Use the final resolved ID
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
        p_customer_address,
        p_customer_postcode,
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
            excluded_toppings,
            selected_replacers,
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
            COALESCE(v_item->'excluded_toppings', '[]'::jsonb),
            COALESCE(v_item->'selected_replacers', '[]'::jsonb),
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
