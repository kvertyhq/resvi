-- 110_burger_exclusions.sql
-- Adds missing Burgers and specific 'Extras' (Exclusions) for Chicken Stack, Hot Trigger, Our Zinger, Crunchy West, Amarillo, and Chicken Fillet Burger.

DO $$ 
DECLARE
    v_rest_id UUID := 'be1c8d05-bf14-4a48-801b-6919ec42eb15';
    v_cat_crch UUID;
    v_item_chicken_stack UUID;
    v_item_hot_trigger UUID;
    v_item_our_zinger UUID;
    v_item_crunchy_west UUID;
    v_item_amarillo UUID;
    v_item_chicken_fillet UUID;
    
    v_mg_cs_extras UUID;
    v_mg_ht_extras UUID;
    v_mg_oz_extras UUID;
    v_mg_cw_extras UUID;
    v_mg_am_extras UUID;
    v_mg_cb_toppings UUID;
BEGIN
    -- 1. Get Category ID for Crispy Chicken Burgers
    SELECT id INTO v_cat_crch FROM menu_categories WHERE restaurant_id = v_rest_id AND name = 'Crispy Chicken Burgers' LIMIT 1;

    -- 2. Ensure Menu Items exist (Insert if missing)
    -- Chicken Stack
    SELECT id INTO v_item_chicken_stack FROM menu_items WHERE restaurant_id = v_rest_id AND name = 'Chicken Stack' LIMIT 1;
    IF v_item_chicken_stack IS NULL THEN
        INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants)
        VALUES (v_rest_id, v_cat_crch, 'Chicken Stack', 'Crispy chicken with hash brown and cheese.', 5.49, '[{"name": "Single", "price": 5.49}, {"name": "Double", "price": 6.99}]')
        RETURNING id INTO v_item_chicken_stack;
    END IF;

    -- Hot Trigger
    SELECT id INTO v_item_hot_trigger FROM menu_items WHERE restaurant_id = v_rest_id AND name = 'Hot Trigger' LIMIT 1;
    IF v_item_hot_trigger IS NULL THEN
        INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants)
        VALUES (v_rest_id, v_cat_crch, 'Hot Trigger', 'Spicy crispy chicken with jalapenos and hot chilli sauce.', 5.49, '[{"name": "Single", "price": 5.49}, {"name": "Double", "price": 6.99}]')
        RETURNING id INTO v_item_hot_trigger;
    END IF;

    -- Our Zinger
    SELECT id INTO v_item_our_zinger FROM menu_items WHERE restaurant_id = v_rest_id AND name = 'Our Zinger' LIMIT 1;
    IF v_item_our_zinger IS NULL THEN
        INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants)
        VALUES (v_rest_id, v_cat_crch, 'Our Zinger', 'Spicy crispy chicken breast with spicy mayo and lettuce.', 5.49, '[{"name": "Single", "price": 5.49}, {"name": "Double", "price": 6.99}]')
        RETURNING id INTO v_item_our_zinger;
    END IF;

    -- Crunchy West
    SELECT id INTO v_item_crunchy_west FROM menu_items WHERE restaurant_id = v_rest_id AND name = 'Crunchy West' LIMIT 1;
    IF v_item_crunchy_west IS NULL THEN
        INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants)
        VALUES (v_rest_id, v_cat_crch, 'Crunchy West', 'Crispy chicken with West Side Chilli Sauce, lettuce, tomato, onion and mayo.', 5.49, '[{"name": "Single", "price": 5.49}, {"name": "Double", "price": 6.99}]')
        RETURNING id INTO v_item_crunchy_west;
    END IF;

    -- Amarillo
    SELECT id INTO v_item_amarillo FROM menu_items WHERE restaurant_id = v_rest_id AND name = 'Amarillo' LIMIT 1;
    IF v_item_amarillo IS NULL THEN
        INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants)
        VALUES (v_rest_id, v_cat_crch, 'Amarillo', 'Crispy chicken with Amarillo sauce, lettuce, tomato, gherkins and mayo.', 5.49, '[{"name": "Single", "price": 5.49}, {"name": "Double", "price": 6.99}]')
        RETURNING id INTO v_item_amarillo;
    END IF;

    -- Chicken Fillet Burger
    SELECT id INTO v_item_chicken_fillet FROM menu_items WHERE restaurant_id = v_rest_id AND name = 'Chicken Fillet Burger' LIMIT 1;
    IF v_item_chicken_fillet IS NULL THEN
        INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants)
        VALUES (v_rest_id, v_cat_crch, 'Chicken Fillet Burger', 'Standard crispy chicken fillet burger with lettuce, tomato and mayo.', 4.49, '[{"name": "Single", "price": 4.49}, {"name": "Double", "price": 5.99}]')
        RETURNING id INTO v_item_chicken_fillet;
    END IF;

    -- 3. Create Modifier Groups
    -- CHICKEN STACK EXTRAS
    SELECT id INTO v_mg_cs_extras FROM menu_modifiers WHERE restaurant_id = v_rest_id AND name = 'CHICKEN STACK EXTRAS' LIMIT 1;
    IF v_mg_cs_extras IS NULL THEN
        INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection)
        VALUES (v_rest_id, 'CHICKEN STACK EXTRAS', false, true, 0, NULL)
        RETURNING id INTO v_mg_cs_extras;
    END IF;

    -- HOT TRIGGER EXTRAS
    SELECT id INTO v_mg_ht_extras FROM menu_modifiers WHERE restaurant_id = v_rest_id AND name = 'HOT TRIGGER EXTRAS' LIMIT 1;
    IF v_mg_ht_extras IS NULL THEN
        INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection)
        VALUES (v_rest_id, 'HOT TRIGGER EXTRAS', false, true, 0, NULL)
        RETURNING id INTO v_mg_ht_extras;
    END IF;

    -- OUR ZINGER EXTRAS
    SELECT id INTO v_mg_oz_extras FROM menu_modifiers WHERE restaurant_id = v_rest_id AND name = 'OUR ZINGER EXTRAS' LIMIT 1;
    IF v_mg_oz_extras IS NULL THEN
        INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection)
        VALUES (v_rest_id, 'OUR ZINGER EXTRAS', false, true, 0, NULL)
        RETURNING id INTO v_mg_oz_extras;
    END IF;

    -- CRUNCHY WEST EXTRAS [IMAGE 1]
    SELECT id INTO v_mg_cw_extras FROM menu_modifiers WHERE restaurant_id = v_rest_id AND name = 'CRUNCHY WEST EXTRAS' LIMIT 1;
    IF v_mg_cw_extras IS NULL THEN
        INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection)
        VALUES (v_rest_id, 'CRUNCHY WEST EXTRAS', false, true, 0, NULL)
        RETURNING id INTO v_mg_cw_extras;
    END IF;

    -- AMARILLO EXTRAS [IMAGE 2]
    SELECT id INTO v_mg_am_extras FROM menu_modifiers WHERE restaurant_id = v_rest_id AND name = 'AMARILLO EXTRAS' LIMIT 1;
    IF v_mg_am_extras IS NULL THEN
        INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection)
        VALUES (v_rest_id, 'AMARILLO EXTRAS', false, true, 0, NULL)
        RETURNING id INTO v_mg_am_extras;
    END IF;

    -- Chicken Burger Main Toppings [IMAGE 3]
    SELECT id INTO v_mg_cb_toppings FROM menu_modifiers WHERE restaurant_id = v_rest_id AND name = 'Chicken Burger Main Toppings' LIMIT 1;
    IF v_mg_cb_toppings IS NULL THEN
        INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection)
        VALUES (v_rest_id, 'Chicken Burger Main Toppings', false, true, 0, NULL)
        RETURNING id INTO v_mg_cb_toppings;
    END IF;

    -- 4. Insert Modifier Items
    -- CHICKEN STACK EXTRAS
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment)
    VALUES 
    (v_mg_cs_extras, 'NO Melted Cheese', 0),
    (v_mg_cs_extras, 'NO Hash Brown', 0),
    (v_mg_cs_extras, 'NO Lettuce', 0),
    (v_mg_cs_extras, 'NO Mayo', 0)
    ON CONFLICT DO NOTHING;

    -- HOT TRIGGER EXTRAS
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment)
    VALUES 
    (v_mg_ht_extras, 'NO Jalapeno', 0),
    (v_mg_ht_extras, 'NO Cheese', 0),
    (v_mg_ht_extras, 'NO Hot Chilli Sauce', 0)
    ON CONFLICT DO NOTHING;

    -- OUR ZINGER EXTRAS
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment)
    VALUES 
    (v_mg_oz_extras, 'NO Turkey Rusher', 0),
    (v_mg_oz_extras, 'NO Melted Cheese', 0),
    (v_mg_oz_extras, 'NO Three Bites Sauce', 0),
    (v_mg_oz_extras, 'NO Tomato', 0)
    ON CONFLICT DO NOTHING;

    -- CRUNCHY WEST EXTRAS [IMAGE 1]
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment)
    VALUES 
    (v_mg_cw_extras, 'NO Lettuce', 0),
    (v_mg_cw_extras, 'NO Tomato', 0),
    (v_mg_cw_extras, 'NO Onion', 0),
    (v_mg_cw_extras, 'NO Mayo', 0),
    (v_mg_cw_extras, 'NO West Side Chilli Sauce', 0)
    ON CONFLICT DO NOTHING;

    -- AMARILLO EXTRAS [IMAGE 2]
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment)
    VALUES 
    (v_mg_am_extras, 'NO Lettuce', 0),
    (v_mg_am_extras, 'NO Fresh Tomato', 0),
    (v_mg_am_extras, 'NO Fresh Onion', 0),
    (v_mg_am_extras, 'NO Gherkins', 0),
    (v_mg_am_extras, 'NO Mayo', 0)
    ON CONFLICT DO NOTHING;

    -- Chicken Burger Main Toppings [IMAGE 3]
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment)
    VALUES 
    (v_mg_cb_toppings, 'NO Lettuce', 0),
    (v_mg_cb_toppings, 'NO Tomato', 0),
    (v_mg_cb_toppings, 'NO Mayo', 0)
    ON CONFLICT DO NOTHING;

    -- 5. Link Groups to Items
    -- Chicken Stack
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id, order_index)
    VALUES (v_item_chicken_stack, v_mg_cs_extras, 1)
    ON CONFLICT (menu_item_id, modifier_group_id) DO NOTHING;

    -- Hot Trigger
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id, order_index)
    VALUES (v_item_hot_trigger, v_mg_ht_extras, 1)
    ON CONFLICT (menu_item_id, modifier_group_id) DO NOTHING;

    -- Our Zinger
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id, order_index)
    VALUES (v_item_our_zinger, v_mg_oz_extras, 1)
    ON CONFLICT (menu_item_id, modifier_group_id) DO NOTHING;

    -- Crunchy West [NEW]
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id, order_index)
    VALUES (v_item_crunchy_west, v_mg_cw_extras, 1)
    ON CONFLICT (menu_item_id, modifier_group_id) DO NOTHING;

    -- Amarillo
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id, order_index)
    VALUES (v_item_amarillo, v_mg_am_extras, 1) -- Now has its own group
    ON CONFLICT (menu_item_id, modifier_group_id) DO NOTHING;

    -- Chicken Fillet Burger [NEW]
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id, order_index)
    VALUES (v_item_chicken_fillet, v_mg_cb_toppings, 1)
    ON CONFLICT (menu_item_id, modifier_group_id) DO NOTHING;

END $$;
