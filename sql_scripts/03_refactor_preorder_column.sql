-- 1. Add preorder_summary column to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS preorder_summary TEXT;

-- 2. Drop the separate table (optional, but good for cleanup if not used)
DROP TABLE IF EXISTS booking_items;

-- 3. Update create_booking to accept summary string instead of items array
CREATE OR REPLACE FUNCTION create_booking(
    p_restaurant_id UUID,
    p_user_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_date DATE,
    p_time TEXT,
    p_guest_count INTEGER,
    p_table_count INTEGER,
    p_notes TEXT,
    p_auto_confirm BOOLEAN,
    p_preorder_summary TEXT DEFAULT NULL -- Changed from p_items
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
BEGIN
    INSERT INTO bookings (
        restaurant_id,
        user_id,
        name,
        phone,
        booking_date,
        booking_time,
        guest_count,
        table_count,
        notes,
        status,
        preorder_summary, -- Insert the summary here
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
        p_preorder_summary,
        NOW()
    )
    RETURNING id INTO v_booking_id;

    RETURN v_booking_id;
END;
$$;
