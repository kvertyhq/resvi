-- Migration: Add p_order_source to create_order_by_phone
-- Based on the actual existing function definition.
-- Adds p_order_source order_source DEFAULT 'online' parameter
-- and sets source column on the orders INSERT.

CREATE OR REPLACE FUNCTION create_order_by_phone(
  p_delivery_address_id uuid,
  p_delivery_fee numeric,
  p_items jsonb,
  p_mark_payment_completed boolean,
  p_name text,
  p_notes text,
  p_order_type order_type,
  p_payment_method text,
  p_phone text,
  p_restaurant_id uuid,
  p_scheduled_time timestamptz,
  p_transaction_id text,
  p_order_source order_source DEFAULT 'online'  -- NEW PARAMETER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_order_id uuid;
  v_readable_order_id text;
  v_item record;
  v_menu_price numeric;
  v_menu_name text;
  v_qty int;
  v_addon_total numeric;
  v_subtotal numeric := 0;
  v_tax_rate numeric := 0;
  v_tax_amount numeric := 0;
  v_total numeric := 0;
  v_payment_status payment_status := 'unpaid'::payment_status;
  v_now timestamptz := now();
  v_rest_exists int;
  v_user uuid := null;
  v_norm_phone text;
begin
  -- required validations
  if p_order_type is null then
    raise exception 'p_order_type is required';
  end if;
  if p_restaurant_id is null then
    raise exception 'p_restaurant_id is required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'p_items must be a non-empty JSON array';
  end if;

  -- ensure restaurant exists
  select count(1) into v_rest_exists from restaurant_settings where id = p_restaurant_id;
  if v_rest_exists = 0 then
    raise exception 'restaurant not found: %', p_restaurant_id::text;
  end if;

  -- normalize phone: remove all non-digit characters
  v_norm_phone := nullif(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), '');

  -- try to resolve profile by normalized phone
  if v_norm_phone is not null then
    select id into v_user
    from profiles
    where regexp_replace(coalesce(phone,''), '\D', '', 'g') = v_norm_phone
    limit 1;
  end if;

  -- if not found, create lightweight profile (only if phone or name provided)
  if v_user is null and (p_name is not null or p_phone is not null) then
    insert into profiles (full_name, phone, created_at, updated_at)
    values (p_name, p_phone, now(), now())
    returning id into v_user;
  end if;

  -- fetch tax rate
  select coalesce(tax_rate, 0) into v_tax_rate
  from restaurant_settings
  where id = p_restaurant_id
  limit 1;

  -- compute subtotal & validate items
  for v_item in select * from jsonb_to_recordset(p_items) as x(menu_item_id uuid, quantity int, modifiers jsonb, selected_addons jsonb)
  loop
    if v_item.menu_item_id is null then
      raise exception 'each item must include menu_item_id';
    end if;

    v_qty := coalesce(v_item.quantity, 1);
    if v_qty <= 0 then
      raise exception 'quantity must be > 0 for item %', v_item.menu_item_id::text;
    end if;

    select price, name into v_menu_price, v_menu_name
    from menu_items
    where id = v_item.menu_item_id
      and (restaurant_id = p_restaurant_id or restaurant_id is null)
    limit 1;

    if v_menu_price is null then
      raise exception 'menu_item not found or not accessible: %', v_item.menu_item_id::text;
    end if;

    if not (select coalesce(is_available, true) from menu_items where id = v_item.menu_item_id) then
      raise exception 'menu_item not available: %', v_item.menu_item_id::text;
    end if;

    -- Calculate Add-ons Price
    v_addon_total := 0;
    if v_item.selected_addons is not null and jsonb_typeof(v_item.selected_addons) = 'array' then
       select coalesce(sum(price), 0) into v_addon_total
       from addons
       where id in (select (value->>'id')::uuid from jsonb_array_elements(v_item.selected_addons));
    end if;

    v_subtotal := v_subtotal + ((v_menu_price + v_addon_total) * v_qty);
  end loop;

  -- totals
  v_tax_amount := round((v_subtotal * v_tax_rate / 100)::numeric, 2);
  v_total := round((v_subtotal + v_tax_amount + coalesce(p_delivery_fee, 0))::numeric, 2);

  -- payment status based on provided payment method
  if p_payment_method is null then
    v_payment_status := 'unpaid'::payment_status;
  else
    if p_mark_payment_completed then
      v_payment_status := 'paid'::payment_status;
    else
      v_payment_status := 'unpaid'::payment_status;
    end if;
  end if;

  -- insert order (use resolved v_user)
  insert into orders (
    user_id,
    order_type,
    status,
    total_amount,
    payment_status,
    payment_method,
    delivery_address_id,
    scheduled_time,
    notes,
    metadata,
    restaurant_id,
    source,           -- NEW: order source column
    created_at,
    updated_at
  )
  values (
    v_user,
    p_order_type,
    'pending'::order_status,
    v_total,
    v_payment_status,
    p_payment_method,
    p_delivery_address_id,
    p_scheduled_time,
    p_notes,
    jsonb_build_object('subtotal', v_subtotal, 'tax', v_tax_amount, 'delivery_fee', coalesce(p_delivery_fee, 0)),
    p_restaurant_id,
    p_order_source,   -- NEW: use the parameter
    v_now,
    v_now
  )
  returning id, readable_id into v_order_id, v_readable_order_id;

  -- insert order_items snapshots
  for v_item in select * from jsonb_to_recordset(p_items) as x(menu_item_id uuid, quantity int, modifiers jsonb, selected_addons jsonb)
  loop
    v_qty := coalesce(v_item.quantity, 1);
    select price, name into v_menu_price, v_menu_name
      from menu_items
      where id = v_item.menu_item_id
      limit 1;

    insert into order_items (
      order_id,
      menu_item_id,
      name_snapshot,
      price_snapshot,
      quantity,
      modifiers,
      selected_addons,
      created_at,
      updated_at,
      restaurant_id
    ) values (
      v_order_id,
      v_item.menu_item_id,
      v_menu_name,
      v_menu_price,
      v_qty,
      coalesce(v_item.modifiers, '{}'::jsonb),
      coalesce(v_item.selected_addons, '[]'::jsonb),
      v_now,
      v_now,
      p_restaurant_id
    );
  end loop;

  -- payments (optional)
  if p_payment_method is not null then
    insert into payments (
      order_id,
      payment_method,
      transaction_id,
      status,
      amount,
      gateway_response,
      created_at,
      updated_at,
      restaurant_id
    )
    values (
      v_order_id,
      p_payment_method::payment_method,
      p_transaction_id,
      CASE WHEN p_mark_payment_completed THEN 'paid'::payment_status ELSE 'unpaid'::payment_status END,
      v_total,
      jsonb_build_object('note','created via create_order_by_phone rpc'),
      v_now,
      v_now,
      p_restaurant_id
    );

    if p_mark_payment_completed then
      update orders set payment_status = 'paid'::payment_status, updated_at = now() where id = v_order_id;
    end if;
  end if;

  -- notification
  insert into notifications (user_id, notification_type, payload, restaurant_id, created_at)
  values (
    v_user,
    'order_created',
    jsonb_build_object('order_id', v_order_id, 'restaurant_id', p_restaurant_id, 'total', v_total, 'status', 'pending', 'when', v_now),
    p_restaurant_id,
    v_now
  );

  -- return result
  return jsonb_build_object(
    'success', true,
    'order_id', coalesce(v_readable_order_id, v_order_id::text),
    'order_uuid', v_order_id,
    'user_id', v_user,
    'phone_normalized', v_norm_phone,
    'subtotal', v_subtotal,
    'tax', v_tax_amount,
    'delivery_fee', coalesce(p_delivery_fee, 0),
    'total', v_total,
    'payment_status', v_payment_status::text
  );

exception
  when others then
    return jsonb_build_object('success', false, 'error', sqlstate, 'message', sqlerrm);
end;
$function$;

GRANT EXECUTE ON FUNCTION create_order_by_phone TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_by_phone TO anon;
