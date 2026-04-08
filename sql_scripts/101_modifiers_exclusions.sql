-- 101: Create Modifier Exclusions (as seen in UI images)
-- This script creates the "NO ..." modifier groups and links them to their respective burgers.

DO $$ 
DECLARE
    rest_id UUID := 'be1c8d05-bf14-4a48-801b-6919ec42eb15';
    
    -- Categories: Crispy Chicken Burgers
    cat_crch UUID;

    -- Modifier Groups
    mg_chicken_toppings UUID;
    mg_amarillo_extras UUID;
    mg_crunchy_west_extras UUID;
    mg_zinger_extras UUID;
    mg_hot_trigger_extras UUID;

    -- Menu Item IDs
    item_zinger UUID;
    item_amarillo UUID;
    item_crunchy_west UUID;
    item_hot_trigger UUID;
    item_chicken_burger UUID;

BEGIN
    -- 1. Get Category ID: Crispy Chicken Burgers
    SELECT id INTO cat_crch FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Crispy Chicken Burgers' LIMIT 1;
    
    -- 2. Create Modifier Groups
    
    -- Group: Chicken Burger Main Toppings
    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'Chicken Burger Main Toppings', false, true, 0, null) RETURNING id INTO mg_chicken_toppings;
    
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES 
    (mg_chicken_toppings, 'NO Lettuce', 0),
    (mg_chicken_toppings, 'NO Tomato', 0),
    (mg_chicken_toppings, 'NO Mayo', 0);

    -- Group: AMARILLO EXTRAS
    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'AMARILLO EXTRAS', false, true, 0, null) RETURNING id INTO mg_amarillo_extras;
    
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES 
    (mg_amarillo_extras, 'NO Lettuce', 0),
    (mg_amarillo_extras, 'NO Fresh Tomato', 0),
    (mg_amarillo_extras, 'NO Fresh Onion', 0),
    (mg_amarillo_extras, 'NO Gherkins', 0),
    (mg_amarillo_extras, 'NO Mayo', 0);

    -- Group: CRUNCHY WEST EXTRAS
    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'CRUNCHY WEST EXTRAS', false, true, 0, null) RETURNING id INTO mg_crunchy_west_extras;
    
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES 
    (mg_crunchy_west_extras, 'NO Lettuce', 0),
    (mg_crunchy_west_extras, 'NO Tomato', 0),
    (mg_crunchy_west_extras, 'NO Onion', 0),
    (mg_crunchy_west_extras, 'NO Mayo', 0),
    (mg_crunchy_west_extras, 'NO West Side Chilli Sauce', 0);

    -- Group: OUR ZINGER EXTRAS
    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'OUR ZINGER EXTRAS', false, true, 0, null) RETURNING id INTO mg_zinger_extras;
    
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES 
    (mg_zinger_extras, 'NO Turkey Rusher', 0),
    (mg_zinger_extras, 'NO Melted Cheese', 0),
    (mg_zinger_extras, 'NO Three Bites Sauce', 0),
    (mg_zinger_extras, 'NO Tomato', 0);

    -- Group: HOT TRIGGER EXTRAS
    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'HOT TRIGGER EXTRAS', false, true, 0, null) RETURNING id INTO mg_hot_trigger_extras;
    
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES 
    (mg_hot_trigger_extras, 'NO Jalapeno', 0),
    (mg_hot_trigger_extras, 'NO Cheese', 0),
    (mg_hot_trigger_extras, 'NO Hot Chilli Sauce', 0);

    -- 3. Link Modifier Groups to Menu Items (Linking to actual items if they exist)
    
    -- Our Zinger
    SELECT id INTO item_zinger FROM menu_items WHERE restaurant_id = rest_id AND name = 'Our Zinger' LIMIT 1;
    IF item_zinger IS NOT NULL THEN
        INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (item_zinger, mg_zinger_extras);
    END IF;

    -- Amarillo
    SELECT id INTO item_amarillo FROM menu_items WHERE restaurant_id = rest_id AND name = 'Amarillo' LIMIT 1;
    IF item_amarillo IS NOT NULL THEN
        INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (item_amarillo, mg_amarillo_extras);
    END IF;

    -- Crunchy West
    SELECT id INTO item_crunchy_west FROM menu_items WHERE restaurant_id = rest_id AND name = 'Crunchy West' LIMIT 1;
    IF item_crunchy_west IS NOT NULL THEN
        INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (item_crunchy_west, mg_crunchy_west_extras);
    END IF;

    -- Hot Trigger
    SELECT id INTO item_hot_trigger FROM menu_items WHERE restaurant_id = rest_id AND name = 'Hot Trigger' LIMIT 1;
    IF item_hot_trigger IS NOT NULL THEN
        INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (item_hot_trigger, mg_hot_trigger_extras);
    END IF;

    -- Standard Chicken Burger (if exists)
    SELECT id INTO item_chicken_burger FROM menu_items WHERE restaurant_id = rest_id AND (name = 'Chicken Burger' OR name = 'Crispy Chicken Burger') LIMIT 1;
    IF item_chicken_burger IS NOT NULL THEN
        INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (item_chicken_burger, mg_chicken_toppings);
    END IF;

END $$;
