-- Migration: Update Walk-In Order RPC Function to support station_id
-- Description: Updates the RPC function to handle station_id in order items

CREATE OR REPLACE FUNCTION create_walkin_order(
    p_restaurant_id UUID,
    p_staff_id UUID,
    p_order_items JSONB,
    p_total_amount DECIMAL(10,2),
    p_user_id UUID DEFAULT NULL,
    p_discount_type TEXT DEFAULT NULL,
    p_discount_amount DECIMAL(10,2) DEFAULT 0,
    p_payment_method TEXT DEFAULT NULL,
    p_payment_transaction_id TEXT DEFAULT NULL
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
        RETURN json_build_object(
            'success', false,
            'error', 'Restaurant ID is required'
        );
    END IF;

    IF p_staff_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Staff ID is required'
        );
    END IF;

    IF p_order_items IS NULL OR jsonb_array_length(p_order_items) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Order must contain at least one item'
        );
    END IF;

    IF p_total_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Total amount must be greater than zero'
        );
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
        created_at
    ) VALUES (
        p_restaurant_id,
        p_user_id,
        p_staff_id,
        NULL, -- Walk-in orders have no table
        p_total_amount,
        CASE WHEN p_payment_method IS NOT NULL THEN 'confirmed'::order_status ELSE 'pending'::order_status END,
        CASE WHEN p_payment_method IS NOT NULL THEN 'paid'::payment_status ELSE 'unpaid'::payment_status END,
        'takeaway',
        true,
        p_discount_type,
        p_discount_amount,
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
            notes,
            course,
            is_miscellaneous,
            custom_item_name,
            name_snapshot,
            station_id -- Added column
        ) VALUES (
            v_order_id,
            CASE 
                WHEN COALESCE((v_item->>'is_miscellaneous')::BOOLEAN, false) = true THEN NULL
                ELSE (v_item->>'menu_item_id')::UUID
            END,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price')::DECIMAL(10,2),
            COALESCE(v_item->'modifiers', '[]'::jsonb),
            v_item->>'notes',
            COALESCE(v_item->>'course', 'Main'),
            COALESCE((v_item->>'is_miscellaneous')::BOOLEAN, false),
            v_item->>'custom_item_name',
            v_item->>'name',
            (v_item->>'station_id')::UUID -- Added value
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

    -- Return success with order ID
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
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION create_walkin_order TO authenticated;
