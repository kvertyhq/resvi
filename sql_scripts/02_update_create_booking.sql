CREATE OR REPLACE FUNCTION create_booking(
    p_restaurant_id UUID,
    p_user_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_date DATE, -- This usually matches p_booking_date name from frontend call, need to be careful with names
    p_time TEXT, -- p_booking_time
    p_guest_count INTEGER,
    p_table_count INTEGER,
    p_notes TEXT,
    p_auto_confirm BOOLEAN,
    p_items JSONB DEFAULT '[]'::jsonb -- New parameter for items
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_item JSONB;
BEGIN
    -- Insert into bookings
    INSERT INTO bookings (
        restaurant_id,
        user_id,
        name, -- mapped from p_name
        phone, -- mapped from p_phone
        booking_date, -- mapped from p_date
        booking_time, -- mapped from p_time
        guest_count,
        table_count,
        notes,
        status,
        created_at
    ) VALUES (
        p_restaurant_id,
        p_user_id,
        p_name,
        p_phone,
        p_date,
        p_time,
        p_guest_count,
        p_table_count,
        p_notes,
        CASE WHEN p_auto_confirm THEN 'confirmed' ELSE 'pending' END,
        NOW()
    )
    RETURNING id INTO v_booking_id;

    -- Process items if any
    IF jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO booking_items (
                booking_id,
                menu_item_id,
                name,
                price,
                quantity,
                selected_addons
            ) VALUES (
                v_booking_id,
                (v_item->>'id')::UUID,
                v_item->>'name',
                (v_item->>'price')::DECIMAL,
                (v_item->>'quantity')::INTEGER,
                COALESCE(v_item->'selected_addons', '[]'::jsonb)
            );
        END LOOP;
    END IF;

    RETURN v_booking_id;
END;
$$;
