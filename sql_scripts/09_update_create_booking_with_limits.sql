-- Drop previous signatures (try to remove any conflicting variants)
drop function if exists public.create_booking(date, time, int, uuid, text, text, int, text, boolean);
drop function if exists public.create_booking(date, time, int, uuid, text, text, uuid, int, text, boolean);
-- Drop the one created in previous steps (with p_items) to be safe
drop function if exists public.create_booking(uuid, uuid, text, text, date, text, int, int, text, boolean, jsonb);


-- New create_booking function (tenant-aware, phone-based profile resolution + Max Table Bookings Limit)
create or replace function public.create_booking(
  p_booking_date date,
  p_booking_time time,
  p_guest_count int,
  p_restaurant_id uuid,                -- required: restaurant tenant
  p_phone text default null,           -- client supplies phone (preferred)
  p_name text default null,            -- optional name (used to create profile)
  p_user_id uuid default null,         -- optional explicit user id (will be validated)
  p_table_count int default null,      -- optional, stored in metadata
  p_notes text default null,
  p_auto_confirm boolean default false,
  p_preorder_summary TEXT DEFAULT NULL
)
returns jsonb
language plpgsql
security definer
volatile
as $$
declare
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
begin
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

  -- verify restaurant exists
  select count(1) into v_rest_exists from restaurant_settings where id = p_restaurant_id;
  if v_rest_exists = 0 then
    raise exception 'restaurant_settings not found for id: %', p_restaurant_id::text;
  end if;

  -- fetch restaurant-specific max booking size (fallback to 100)
  select coalesce(max_booking_size, 100) into v_max_booking_size
  from restaurant_settings
  where id = p_restaurant_id
  limit 1;

  -- guest count validation
  if p_guest_count <= 0 then
    raise exception 'guest_count must be > 0';
  end if;
  if p_guest_count > v_max_booking_size then
    raise exception 'guest_count (%) exceeds the max allowed (%) for this restaurant',
      p_guest_count, v_max_booking_size;
  end if;

  -- ---------------------------------------------------------
  -- MAX TABLE BOOKINGS LIMIT CHECK (Merged Feature)
  -- ---------------------------------------------------------
    -- Get the day name (e.g., 'mon', 'tue')
    SELECT lower(trim(to_char(p_booking_date, 'Day'))) INTO v_day_name;
    v_day_name := substring(v_day_name, 1, 3); -- Ensure 3 chars

    -- Fetch restaurant settings specifically for capacities
    SELECT timeslot_capacities INTO v_settings
    FROM restaurant_settings
    WHERE id = p_restaurant_id; -- Note: using 'id' as per user's snippet where schema seems to imply 'id' is p_restaurant_id. Or 'restaurant_id'?
    -- User's snippet used: "from restaurant_settings where id = p_restaurant_id;"
    -- My previous snippet used: "where restaurant_id = p_restaurant_id;"
    -- Based on user's snippet "select count(1) into v_rest_exists from restaurant_settings where id = p_restaurant_id;", 
    -- I will assume 'id' IS the primary key of restaurant_settings for that restaurant.

    -- Construct the key, e.g., 'mon_19:00'
    v_capacity_key := v_day_name || '_' || p_booking_time::text;
    -- Note: p_booking_time is TIME type, need to cast to text and maybe strip seconds if needed.
    -- formatTime in frontend formats as HH:MM. Cast to text usually gives HH:MM:SS.
    -- Let's try to substring to HH:MM.
    v_capacity_key := v_day_name || '_' || substring(p_booking_time::text, 1, 5);

    -- Extract the limit for 'max_bookings'
    IF v_settings IS NOT NULL AND v_settings ? v_capacity_key THEN
        v_limit := (v_settings->v_capacity_key->>'max_bookings')::INTEGER;
    END IF;

    -- If a limit is set, count existing bookings
    IF v_limit IS NOT NULL AND v_limit > 0 THEN
        SELECT count(*) INTO v_current_count
        FROM bookings
        WHERE restaurant_id = p_restaurant_id
          AND booking_date = p_booking_date
          AND booking_time = p_booking_time
          AND status IN ('confirmed', 'pending'); -- Only count active bookings

        IF v_current_count >= v_limit THEN
             return jsonb_build_object(
                'success', false,
                'error_message', 'This time slot is fully booked.'
            );
        END IF;
    END IF;
  -- ---------------------------------------------------------

  -- status handling (cast to enum)
  if p_auto_confirm then
    v_status := 'confirmed'::booking_status;
  else
    v_status := 'pending'::booking_status;
  end if;

  -- Resolve user:
  -- 1) if p_user_id provided and exists, use it
  if p_user_id is not null then
    select count(1) into v_user_exists from profiles where id = p_user_id;
    if v_user_exists > 0 then
      v_user := p_user_id;
    else
      -- if provided user_id not found, attempt phone/name creation if available
      if p_phone is not null or p_name is not null then
        insert into profiles (full_name, phone, created_at, updated_at)
        values (p_name, p_phone, now(), now())
        returning id into v_user;
      else
        -- fallback to guest (null)
        v_user := null;
      end if;
    end if;
  else
    -- 2) if no p_user_id, try to find by normalized phone
    if p_phone is not null then
      v_norm_phone := nullif(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), '');
      if v_norm_phone is not null then
        select id into v_user from profiles
        where regexp_replace(coalesce(phone,''), '\D', '', 'g') = v_norm_phone
        limit 1;
      end if;
    end if;

    -- 3) if still not found and we have name/phone, create a lightweight profile
    if v_user is null and (p_name is not null or p_phone is not null) then
      insert into profiles (full_name, phone, created_at, updated_at)
      values (p_name, p_phone, now(), now())
      returning id into v_user;
    end if;
    -- otherwise v_user stays null (guest)
  end if;

  -- Insert booking (store table_count in metadata to avoid schema changes)
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

  -- Notification for staff / user
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
      'table_count', p_table_count
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

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', sqlstate,
      'error_message', sqlerrm
    );
end;
$$;
