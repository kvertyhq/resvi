-- 1. Add daily_order_number column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS daily_order_number INTEGER;

-- 2. Create function to assign daily order number
CREATE OR REPLACE FUNCTION assign_daily_order_number()
RETURNS TRIGGER AS $$
DECLARE
    v_restaurant_timezone TEXT;
    v_today_start TIMESTAMP WITH TIME ZONE;
    v_next_number INTEGER;
BEGIN
    -- Get restaurant timezone or default to UTC
    SELECT timezone INTO v_restaurant_timezone
    FROM restaurant_settings
    WHERE id = NEW.restaurant_id;

    IF v_restaurant_timezone IS NULL THEN
        v_restaurant_timezone := 'UTC';
    END IF;

    -- Calculate start of day in restaurant's timezone
    -- We convert NOW() to the restaurant's timezone, truncate to day, then convert back to UTC logic if needed for comparison, 
    -- but usually 'AT TIME ZONE' handles the shift.
    
    -- Correct logic: Get current time in that timezone, truncate to day.
    -- v_today_start := date_trunc('day', NOW() AT TIME ZONE v_restaurant_timezone); 
    -- But we want to compare against 'created_at' which is timestamptz (UTC).
    -- So we need to match orders where created_at (in restaurant time) is same day.
    
    -- Let's stick to a simpler approach: 
    -- Find max daily_order_number for this restaurant today.
    
    SELECT COALESCE(MAX(daily_order_number), 0) + 1
    INTO v_next_number
    FROM orders
    WHERE restaurant_id = NEW.restaurant_id
      AND date_trunc('day', created_at AT TIME ZONE v_restaurant_timezone) = date_trunc('day', NOW() AT TIME ZONE v_restaurant_timezone);

    NEW.daily_order_number := v_next_number;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trg_assign_daily_order_number ON orders;

CREATE TRIGGER trg_assign_daily_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION assign_daily_order_number();
