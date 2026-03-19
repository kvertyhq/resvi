-- Script to seed remaining Burgers, Kebabs, and Wraps based on transcribed menu images.
-- Associates each with the correct Modifier Groups (Salad, Sauce, Bun, Meal, etc.)

DO $$ 
DECLARE
    rest_id UUID := 'be1c8d05-bf14-4a48-801b-6919ec42eb15';
    
    -- Category IDs
    cat_ambf UUID;
    cat_crch UUID;
    cat_vgfh UUID;
    cat_grbf UUID;
    cat_grch UUID;
    cat_kbbs UUID;
    cat_riok UUID;
    cat_mtch UUID;
    cat_kbwr UUID;
    cat_chkwr UUID;

    -- Modifier Group IDs
    mg_make_meal UUID;
    mg_bun_choice UUID;
    mg_extra_patty UUID;
    mg_salad UUID;
    mg_sauce UUID;

    -- Temp var
    temp_item UUID;
BEGIN
    -- 1. Get Category IDs
    SELECT id INTO cat_ambf FROM menu_categories WHERE restaurant_id = rest_id AND name = 'American Beef Burgers' LIMIT 1;
    SELECT id INTO cat_crch FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Crispy Chicken Burgers' LIMIT 1;
    SELECT id INTO cat_vgfh FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Vegetarian & Fish Burgers' LIMIT 1;
    SELECT id INTO cat_grbf FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Gourmet Beef Burgers' LIMIT 1;
    SELECT id INTO cat_grch FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Grilled Chicken Burgers' LIMIT 1;
    SELECT id INTO cat_kbbs FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Kebabs' LIMIT 1;
    SELECT id INTO cat_riok FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Rio Kebab' LIMIT 1;
    SELECT id INTO cat_mtch FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Meat On Chips' LIMIT 1;
    SELECT id INTO cat_kbwr FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Kebab Wraps' LIMIT 1;
    SELECT id INTO cat_chkwr FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Chicken Wraps' LIMIT 1;

    -- 2. Get Modifier Group IDs
    SELECT id INTO mg_make_meal FROM menu_modifiers WHERE restaurant_id = rest_id AND name = 'Make it a Meal (+ £1.99)' LIMIT 1;
    SELECT id INTO mg_bun_choice FROM menu_modifiers WHERE restaurant_id = rest_id AND name = 'Choice of Bun' LIMIT 1;
    SELECT id INTO mg_extra_patty FROM menu_modifiers WHERE restaurant_id = rest_id AND name = 'Extra Patty' LIMIT 1;
    SELECT id INTO mg_salad FROM menu_modifiers WHERE restaurant_id = rest_id AND name = 'Choose Your Salad' LIMIT 1;
    SELECT id INTO mg_sauce FROM menu_modifiers WHERE restaurant_id = rest_id AND name = 'Choose Your Sauces' LIMIT 1;

    -- 3. AMERICAN BEEF BURGERS (Remaining)
    -- Cowboy, Flaming Hot, Griller, Late Breakfast, Mix Grill, Plain Cheeseburger, Three Bites Special, Wild Bull, Western Special
    -- Variants: 4oz £5.49, 8oz £6.99 (Plain Cheeseburger is lower)
    
    -- Cowboy
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_ambf, 'Cowboy', 'Onion rings, BBQ sauce, lettuce and cheese.', 5.49, '[{"name": "4oz", "price": 5.49}, {"name": "8oz", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_bun_choice), (temp_item, mg_make_meal);

    -- Flaming Hot
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_ambf, 'Flaming Hot', 'Jalapenos, chilli sauce, lettuce and cheese.', 5.49, '[{"name": "4oz", "price": 5.49}, {"name": "8oz", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_bun_choice), (temp_item, mg_make_meal);

    -- Griller
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_ambf, 'Griller', 'Fried mushrooms, onions, lettuce and cheese.', 5.49, '[{"name": "4oz", "price": 5.49}, {"name": "8oz", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_bun_choice), (temp_item, mg_make_meal);

    -- Late Breakfast
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_ambf, 'Late Breakfast', 'Egg, turkey rashers, lettuce and cheese.', 5.49, '[{"name": "4oz", "price": 5.49}, {"name": "8oz", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_bun_choice), (temp_item, mg_make_meal);

    -- Plain Cheeseburger
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_ambf, 'Plain Cheeseburger', 'Classic burger with cheese.', 4.99, '[{"name": "4oz", "price": 4.99}, {"name": "8oz", "price": 6.49}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_bun_choice), (temp_item, mg_make_meal);

    -- Three Bites Special (Beef)
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_ambf, 'Three Bites Special (Beef)', 'The ultimate beef burger experience.', 5.99, '[{"name": "4oz", "price": 5.99}, {"name": "8oz", "price": 7.49}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_bun_choice), (temp_item, mg_make_meal);


    -- 4. GOURMET BEEF BURGERS (Remaining)
    -- Classic (Partially seeded), Chef''s Favourite, Cowboy, Deluxe, Flaming Hot, Griller, Late Breakfast, Mix Grill, Smokey, Three Bites Special, Wild Bull
    -- Variants: 6oz £6.99, 12oz £9.49

    -- Chef''s Favourite (Gourmet)
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_grbf, 'Chef''s Favourite (Gourmet)', 'Gourmet patty with Turkey rashers and yellow mayo.', 6.99, '[{"name": "6oz", "price": 6.99}, {"name": "12oz", "price": 9.49}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_bun_choice), (temp_item, mg_extra_patty), (temp_item, mg_make_meal);

    -- Smokey (Gourmet)
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_grbf, 'Smokey (Gourmet)', 'With smoky BBQ sauce and onions.', 6.99, '[{"name": "6oz", "price": 6.99}, {"name": "12oz", "price": 9.49}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_bun_choice), (temp_item, mg_extra_patty), (temp_item, mg_make_meal);


    -- 5. CRISPY CHICKEN BURGERS
    -- Amarillo, Chicken Stack, Hot Trigger, Our Zinger
    -- Variants: Single £5.49, Double £6.99

    -- Our Zinger
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_crch, 'Our Zinger', 'Spicy crispy chicken breast with spicy mayo and lettuce.', 5.49, '[{"name": "Single", "price": 5.49}, {"name": "Double", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);

    -- Chicken Stack
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_crch, 'Chicken Stack', 'Crispy chicken with hash brown and cheese.', 5.49, '[{"name": "Single", "price": 5.49}, {"name": "Double", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);


    -- 6. GRILLED CHICKEN BURGERS
    -- Angry Chick, BBQ Twist, Classic Peri Peri, Sizzler
    -- Variants: Single £5.99, Double £7.49

    -- Classic Peri Peri
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_grch, 'Classic Peri Peri', 'Flame-grilled chicken breast marinated in peri-peri sauce.', 5.99, '[{"name": "Single", "price": 5.99}, {"name": "Double", "price": 7.49}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);


    -- 7. VEGETARIAN & FISH BURGERS
    -- Veggie Burger, Fish Burger, Paneer Burger
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_vgfh, 'Veggie Burger', 4.99) RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);

    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_vgfh, 'Fish Burger', 4.99) RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);


    -- 8. KEBABS (Remaining)
    -- Mixed Doner
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_kbbs, 'Mixed Doner', 'Combination of lamb and chicken doner.', 7.99, '[{"name": "Medium", "price": 7.99}, {"name": "Large", "price": 9.49}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_salad), (temp_item, mg_sauce), (temp_item, mg_make_meal);

    -- 9. RIO KEBAB
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_riok, 'Rio Lamb Doner', 'Served with chips, salad and sauce inside the box.', 8.99, '[{"name": "Standard", "price": 8.99}, {"name": "Large", "price": 10.49}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_salad), (temp_item, mg_sauce);

    -- 10. MEAT ON CHIPS
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_mtch, 'Lamb Doner on Chips', 6.99) RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_sauce);

    -- 11. KEBAB WRAPS
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_kbwr, 'Chicken Doner Wrap', 5.99) RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_salad), (temp_item, mg_sauce), (temp_item, mg_make_meal);

    -- 12. CHICKEN WRAPS (Remaining)
    -- Three Bites, Yummy, Spice
    INSERT INTO menu_items (restaurant_id, category_id, name, price_variants) VALUES 
    (rest_id, cat_chkwr, 'Three Bites Wrap', '[{"name": "Crispy Chicken", "price": 5.99}, {"name": "Grilled Chicken", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);

    INSERT INTO menu_items (restaurant_id, category_id, name, price_variants) VALUES 
    (rest_id, cat_chkwr, 'Yummy Wrap', '[{"name": "Crispy Chicken", "price": 5.99}, {"name": "Grilled Chicken", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);

    INSERT INTO menu_items (restaurant_id, category_id, name, price_variants) VALUES 
    (rest_id, cat_chkwr, 'Spice Wrap', '[{"name": "Crispy Chicken", "price": 5.99}, {"name": "Grilled Chicken", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);

    -- 13. SIDE ORDERS (Additional)
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES 
    (rest_id, (SELECT id FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Side Orders' LIMIT 1), 'Wings (6 pcs)', 4.99);
    
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES 
    (rest_id, (SELECT id FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Side Orders' LIMIT 1), 'Jalapeno Cream Cheese (6 pcs)', 4.99);

END $$;
