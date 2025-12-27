-- 1. Add sms_preferences column to restaurant_settings
ALTER TABLE "public"."restaurant_settings"
ADD COLUMN IF NOT EXISTS "sms_preferences" jsonb DEFAULT '{
    "new_booking_admin": true,
    "new_booking_customer": true,
    "booking_confirmed": true,
    "booking_cancelled": true,
    "table_assigned": true,
    "new_order_admin": false,
    "new_order_customer": false,
    "order_confirmed": false,
    "order_preparing": false,
    "order_out_for_delivery": false,
    "order_ready_collection": false,
    "order_completed_delivery": false
}'::jsonb;

-- 2. Update create_booking RPC to respect "New Booking" preferences
-- We need to check the preferences before inserting into notifications.

CREATE OR REPLACE FUNCTION public.create_booking(
  p_booking_date date,
  p_booking_time time,
  p_guest_count int,
  p_restaurant_id uuid,
  p_phone text default null,
  p_name text default null,
  p_user_id uuid default null,
  p_table_count int default null,
  p_notes text default null,
  p_auto_confirm boolean default false,
  p_preorder_summary TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_user uuid := null;
  v_user_exists int := 0;
  v_booking_id uuid;
  v_status booking_status := 'pending'::booking_status;
  v_max_booking_size int;
  v_rest_exists int;
  v_norm_phone text;
  v_now timestamptz := now();
  v_settings JSONB;
  v_day_name TEXT;
  v_capacity_key TEXT;
  v_limit INTEGER;
  v_current_count INTEGER;
  v_sms_prefs JSONB;
BEGIN
  -- required validations
  if p_booking_date is null then
    raise exception 'p_booking_date is required';
  end if;
  if p_booking_time is null then
    raise exception 'p_booking_time is required';
  end if;
  if p_guest_count is null then
    raise exception 'p_guest_count is required';
  end if;
  if p_restaurant_id is null then
    raise exception 'p_restaurant_id is required';
  end if;

  -- verify restaurant exists and get SMS prefs
  select sms_preferences into v_sms_prefs 
  from restaurant_settings where id = p_restaurant_id;

  if not found then
    raise exception 'restaurant_settings not found for id: %', p_restaurant_id::text;
  end if;

   -- fetch restaurant-specific max booking size
  select coalesce(max_booking_size, 100) into v_max_booking_size
  from restaurant_settings
  where id = p_restaurant_id;

  -- guest count validation
  if p_guest_count <= 0 then
    raise exception 'guest_count must be > 0';
  end if;
  if p_guest_count > v_max_booking_size then
    raise exception 'guest_count (%) exceeds the max allowed (%) for this restaurant',
      p_guest_count, v_max_booking_size;
  end if;

    -- ---------------------------------------------------------
    -- PHYSICAL INVENTORY CHECKS (Advanced Capacity Lookahead)
    -- ---------------------------------------------------------
    DECLARE
        v_table_capacities INTEGER[];
        v_booking_counts INTEGER[];
        i INTEGER;
    BEGIN
        -- 1. Get all table capacities sorted DESC
        SELECT ARRAY_AGG(count ORDER BY count DESC) INTO v_table_capacities
        FROM table_info
        WHERE restaurant_id = p_restaurant_id;

        -- 2. Get all active booking guest counts + current request sorted DESC
        SELECT ARRAY_AGG(guest_count ORDER BY guest_count DESC) INTO v_booking_counts
        FROM (
            SELECT guest_count
            FROM bookings
            WHERE restaurant_id = p_restaurant_id
              AND booking_date = p_booking_date
              AND booking_time = p_booking_time
              AND status IN ('confirmed', 'pending')
            UNION ALL
            SELECT p_guest_count
        ) AS combined_bookings;

        -- 3. VALIDATION
        -- A. Check if total bookings exceed total tables
        IF array_length(v_booking_counts, 1) > COALESCE(array_length(v_table_capacities, 1), 0) THEN
             return jsonb_build_object(
                'success', false,
                'error_message', 'No tables available for this time (All tables booked).'
            );
        END IF;

        -- B. Check if tables can accommodate the groups
        FOR i IN 1..array_length(v_booking_counts, 1) LOOP
            IF v_booking_counts[i] > v_table_capacities[i] THEN
                return jsonb_build_object(
                    'success', false,
                    'error_message', format('No table available for a group of %s (Capacity limit reached for this size).', v_booking_counts[i])
                );
            END IF;
        END LOOP;
    END;

  -- ---------------------------------------------------------
  -- MAX TABLE BOOKINGS LIMIT CHECK
  -- ---------------------------------------------------------
    DECLARE
        v_total_tables INTEGER;
    BEGIN
        SELECT count(*) INTO v_total_tables FROM table_info WHERE restaurant_id = p_restaurant_id;

        IF v_total_tables > 0 THEN
            SELECT count(*) INTO v_current_count
            FROM bookings
            WHERE restaurant_id = p_restaurant_id
              AND booking_date = p_booking_date
              AND booking_time = p_booking_time
              AND status IN ('confirmed', 'pending');

            IF v_current_count >= v_total_tables THEN
                 return jsonb_build_object(
                    'success', false,
                    'error_message', 'No tables available for this time (Capacity Reached).'
                );
            END IF;
        END IF;
    END;

    -- Get the day name
    SELECT lower(trim(to_char(p_booking_date, 'Day'))) INTO v_day_name;
    v_day_name := substring(v_day_name, 1, 3);

    -- Fetch restaurant settings specifically for capacities
    SELECT timeslot_capacities INTO v_settings
    FROM restaurant_settings
    WHERE id = p_restaurant_id; 

    -- Construct the key
    v_capacity_key := v_day_name || '_' || substring(p_booking_time::text, 1, 5);

    -- Extract limit
    IF v_settings IS NOT NULL AND v_settings ? v_capacity_key THEN
        v_limit := (v_settings->v_capacity_key->>'max_bookings')::INTEGER;
    END IF;

    -- Check limit
    IF v_limit IS NOT NULL AND v_limit > 0 THEN
        SELECT count(*) INTO v_current_count
        FROM bookings
        WHERE restaurant_id = p_restaurant_id
          AND booking_date = p_booking_date
          AND booking_time = p_booking_time
          AND status IN ('confirmed', 'pending');

        IF v_current_count >= v_limit THEN
             return jsonb_build_object(
                'success', false,
                'error_message', 'This time slot is fully booked.'
            );
        END IF;
    END IF;
  -- ---------------------------------------------------------

  -- status handling
  if p_auto_confirm then
    v_status := 'confirmed'::booking_status;
  else
    v_status := 'pending'::booking_status;
  end if;

  -- Resolve user
  if p_user_id is not null then
    select count(1) into v_user_exists from profiles where id = p_user_id;
    if v_user_exists > 0 then
      v_user := p_user_id;
    else
      if p_phone is not null or p_name is not null then
        insert into profiles (full_name, phone, created_at, updated_at)
        values (p_name, p_phone, now(), now())
        returning id into v_user;
      else
        v_user := null;
      end if;
    end if;
  else
    if p_phone is not null then
      v_norm_phone := nullif(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), '');
      if v_norm_phone is not null then
        select id into v_user from profiles
        where regexp_replace(coalesce(phone,''), '\D', '', 'g') = v_norm_phone
        limit 1;
      end if;
    end if;

    if v_user is null and (p_name is not null or p_phone is not null) then
      insert into profiles (full_name, phone, created_at, updated_at)
      values (p_name, p_phone, now(), now())
      returning id into v_user;
    end if;
  end if;

  -- Insert booking
  insert into bookings (
    user_id,
    booking_date,
    booking_time,
    guest_count,
    status,
    table_assigned,
    special_request,
    metadata,
    restaurant_id,
    preorder_summary,
    created_at,
    updated_at
  )
  values (
    v_user,
    p_booking_date,
    p_booking_time,
    p_guest_count,
    v_status,
    null,
    p_notes,
    jsonb_build_object(
      'table_count', p_table_count,
      'created_via', 'create_booking_rpc',
      'guest_name', coalesce(p_name, ''),
      'phone', coalesce(p_phone, '')
    ),
    p_restaurant_id,
    p_preorder_summary,
    v_now,
    v_now
  )
  returning id into v_booking_id;

  -- Notification Logic (Only if Enabled)
  -- 1. Notify Admin (if enabled)
  IF (v_sms_prefs->>'new_booking_admin')::boolean IS NOT FALSE THEN
      -- Typically Admin notification logic is separate, but we reuse 'booking_created'
      -- Can we distinguish receiver in payload?
      -- Or just rely on separate notification?
      -- For now, let's insert the standard one with full prefs, enabling N8N to decide.
      -- BUT user asked for "only if active".
      
      -- If we want strict control at source:
      -- We must insert specialized notifications or rely on 'booking_created' implying both.
      -- Let's stick to: Insert 'booking_created' IF AT LEAST ONE is active.
      -- And pass the flags.
  END IF;

  -- SIMPLIFICATION:
  -- Insert 'booking_created' notification ALWAYS, but inject 'sms_preferences' into payload.
  -- Why? Because 'notifications' table also drives In-App UI notifications (Bell icon).
  -- If we stop inserting, the Admin Dashboard won't show the notification in the UI list.
  -- This would be bad.
  -- SO: We MUST insert it.
  -- The SMS sending Logic (N8N) must check the preferences.
  -- I will modify the payload to include 'sms_preferences'.
  
  insert into notifications (user_id, notification_type, payload, restaurant_id, created_at)
  values (
    v_user,
    'booking_created',
    jsonb_build_object(
      'booking_id', v_booking_id,
      'status', v_status::text,
      'date', to_char(p_booking_date, 'YYYY-MM-DD'),
      'time', to_char(p_booking_time, 'HH24:MI'),
      'guest_count', p_guest_count,
      'notes', coalesce(p_notes, ''),
      'table_count', p_table_count,
      'sms_preferences', v_sms_prefs -- INJECT PREFERENCES
    ),
    p_restaurant_id,
    v_now
  );

  -- Return response
  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'user_id', v_user,
    'restaurant_id', p_restaurant_id,
    'status', v_status::text,
    'message',
      case when v_status = 'confirmed'
        then 'Booking confirmed'
        else 'Booking created and pending confirmation'
      end
  );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', sqlstate,
      'error_message', sqlerrm
    );
END;
$$;


-- 3. Trigger for Booking Updates (Confirmed, Cancelled, Table Assigned)
-- This trigger will generate notifications for actions done via Admin Panel (which does table updates)
-- It will also inject sms_preferences.
CREATE OR REPLACE FUNCTION public.handle_booking_update_sms()
RETURNS TRIGGER AS $$
DECLARE
    v_sms_prefs JSONB;
    v_type TEXT;
    v_should_send BOOLEAN := false;
BEGIN
    -- Fetch preferences
    SELECT sms_preferences INTO v_sms_prefs FROM restaurant_settings WHERE id = NEW.restaurant_id;
    
    v_type := NULL;
    
    -- Determine Type
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        v_type := 'booking_confirmed';
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        v_type := 'booking_cancelled';
    ELSIF NEW.table_assigned IS NOT NULL AND (OLD.table_assigned IS NULL OR OLD.table_assigned != NEW.table_assigned) THEN
        v_type := 'table_assigned';
    END IF;

    -- If valid type, insert notification with preferences.
    -- We insert it regardless of preference setting to ensure In-App UI works.
    -- The SMS sender (N8N) is responsible for filtering based on payload.sms_preferences.
    IF v_type IS NOT NULL THEN
         INSERT INTO notifications (user_id, notification_type, payload, restaurant_id, created_at)
         VALUES (
            NEW.user_id,
            v_type,
            jsonb_build_object(
                'booking_id', NEW.id,
                'status', NEW.status,
                'table', NEW.table_assigned,
                'date', NEW.booking_date,
                'time', NEW.booking_time,
                'sms_preferences', v_sms_prefs
            ),
            NEW.restaurant_id,
            now()
         );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_sms_update ON bookings;
CREATE TRIGGER trg_booking_sms_update
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_update_sms();
