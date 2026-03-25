-- Migration: Update create_order_by_phone to use category-based tax
-- Joins with menu_categories to get the tax_rate for each item.

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
  p_order_source order_source DEFAULT 'online'
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
  v_item_tax_rate numeric;
  v_qty int;
  v_addon_total numeric;
  v_subtotal numeric := 0;
  v_tax_amount numeric := 0;
  v_total numeric := 0;
  v_payment_status payment_status := 'unpaid'::payment_status;
  v_now timestamptz := now();
  v_rest_exists int;
  v_user uuid := null;
  v_norm_phone text;
  v_show_tax boolean;
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

  -- fetch restaurant settings
  select coalesce(show_tax, true) into v_show_tax 
  from restaurant_settings 
  where id = p_restaurant_id;

  if v_show_tax is null then
    raise exception 'restaurant not found: %', p_restaurant_id::text;
  end if;

  -- normalize phone
  v_norm_phone := nullif(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), '');

  -- try to resolve profile
  if v_norm_phone is not null then
    select id into v_user
    from profiles
    where regexp_replace(coalesce(phone,''), '\D', '', 'g') = v_norm_phone
    limit 1;
  end if;

  if v_user is null and (p_name is not null or p_phone is not null) then
    insert into profiles (full_name, phone, created_at, updated_at)
    values (p_name, p_phone, now(), now())
    returning id into v_user;
  end if;

  -- compute subtotal & tax granularly
  for v_item in select * from jsonb_to_recordset(p_items) as x(menu_item_id uuid, quantity int, modifiers jsonb, selected_addons jsonb)
  loop
    v_qty := coalesce(v_item.quantity, 1);
    
    -- Fetch price and category tax rate
    select mi.price, mi.name, coalesce(cat.tax_rate, 0) 
    into v_menu_price, v_menu_name, v_item_tax_rate
    from menu_items mi
    left join menu_categories cat on cat.id = mi.category_id
    where mi.id = v_item.menu_item_id
      and (mi.restaurant_id = p_restaurant_id or mi.restaurant_id is null)
    limit 1;

    if v_menu_price is null then
      raise exception 'menu_item not found or not accessible: %', v_item.menu_item_id::text;
    end if;

    -- Calculate Add-ons Price
    v_addon_total := 0;
    if v_item.selected_addons is not null and jsonb_typeof(v_item.selected_addons) = 'array' then
       select coalesce(sum(price), 0) into v_addon_total
       from addons
       where id in (select (value->>'id')::uuid from jsonb_array_elements(v_item.selected_addons));
    end if;

    v_subtotal := v_subtotal + ((v_menu_price + v_addon_total) * v_qty);
    -- Add tax for this item if enabled
    if v_show_tax then
      v_tax_amount := v_tax_amount + (((v_menu_price + v_addon_total) * v_qty) * (v_item_tax_rate / 100));
    end if;
  end loop;

  -- Final rounding
  v_tax_amount := round(v_tax_amount::numeric, 2);
  v_total := round((v_subtotal + v_tax_amount + coalesce(p_delivery_fee, 0))::numeric, 2);

  -- payment status
  if p_payment_method is not null and p_mark_payment_completed then
    v_payment_status := 'paid'::payment_status;
  end if;

  -- insert order
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
    source,
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
    p_order_source,
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

  -- payments
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
      v_payment_status,
      v_total,
      jsonb_build_object('note','created via create_order_by_phone rpc'),
      v_now,
      v_now,
      p_restaurant_id
    );
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
