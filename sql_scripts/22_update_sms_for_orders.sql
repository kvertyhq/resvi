-- 1. Update sms_preferences default and existing values
-- We won't change the column default strictly if it risks issues, but we will update existing rows.

DO $$
DECLARE
    r RECORD;
    current_prefs JSONB;
    new_prefs JSONB;
BEGIN
    FOR r IN SELECT id, sms_preferences FROM restaurant_settings LOOP
        current_prefs := r.sms_preferences;
        
        -- Merge new keys with defaults (true)
        new_prefs := current_prefs || '{
            "new_order_admin": true,
            "new_order_customer": true,
            "order_confirmed": true,
            "order_preparing": true,
            "order_out_for_delivery": true,
            "order_ready_collection": true,
            "order_completed_delivery": true
        }'::jsonb;
        
        -- Update the row
        UPDATE restaurant_settings 
        SET sms_preferences = new_prefs 
        WHERE id = r.id;
    END LOOP;
END $$;

-- 2. Create Trigger Function for Orders
CREATE OR REPLACE FUNCTION public.handle_order_sms()
RETURNS TRIGGER AS $$
DECLARE
    v_sms_prefs JSONB;
    v_type TEXT := NULL;
    v_restaurant_id UUID;
    v_user_id UUID;
BEGIN
    v_restaurant_id := NEW.restaurant_id;
    v_user_id := NEW.user_id;

    -- Fetch preferences
    SELECT sms_preferences INTO v_sms_prefs FROM restaurant_settings WHERE id = v_restaurant_id;
    
    -- Case 1: New Order (INSERT)
    IF TG_OP = 'INSERT' THEN
        -- We can create a notification for "new_order"
        -- This covers both Admin and Customer variants (N8N logic will separate them based on payload recipients/prefs)
        v_type := 'new_order';
        
    -- Case 2: Status Updates (UPDATE)
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        
        IF NEW.status = 'confirmed' THEN
            v_type := 'order_confirmed';
            
        ELSIF NEW.status = 'preparing' THEN
            v_type := 'order_preparing';
            
        ELSIF NEW.status = 'out_for_delivery' THEN
            v_type := 'order_out_for_delivery';
            
        ELSIF NEW.status = 'completed' THEN
            IF NEW.order_type = 'collection' THEN
                v_type := 'order_ready_collection'; -- "Ready for pickup"
            ELSE
                 v_type := 'order_completed_delivery'; -- "Delivered"
            END IF;
            
        END IF;
    END IF;

    -- Insert Notification if we have a type
    IF v_type IS NOT NULL THEN
         INSERT INTO notifications (user_id, notification_type, payload, restaurant_id, created_at)
         VALUES (
            v_user_id,
            v_type,
            jsonb_build_object(
                'order_id', NEW.id,
                'readable_id', NEW.readable_id,
                'status', NEW.status,
                'order_type', NEW.order_type,
                'total_amount', NEW.total_amount,
                'sms_preferences', v_sms_prefs, -- INJECT PREFERENCES
                'customer_phone', (SELECT phone FROM profiles WHERE id = NEW.user_id),
                'customer_name', (SELECT full_name FROM profiles WHERE id = NEW.user_id)
            ),
            v_restaurant_id,
            now()
         );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trg_order_sms_update ON orders;
CREATE TRIGGER trg_order_sms_update
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_sms();
