-- This script will inject Categories, Modifier Groups, Size Variants, and Menu Items
-- based exactly on the layout of your menu image. Replace or add to these as needed!
-- You only need to run this ONCE.

DO $$ 
DECLARE
    rest_id UUID;
    
    -- Category IDs
    cat_pizza UUID;
    cat_ambf UUID;
    cat_crch UUID;
    cat_vgfh UUID;
    cat_grbf UUID;
    cat_grch UUID;
    cat_kbbs UUID;
    cat_riok UUID;
    cat_mtch UUID;
    cat_kbwr UUID;

    -- Modifier Group IDs
    mg_pizza_toppings UUID;
    mg_pizza_crust UUID;
    mg_make_meal UUID;
    mg_bun_choice UUID;
    mg_extra_patty UUID;
    mg_salad UUID;
    mg_sauce UUID;

    -- Temporary variable for linking menu items to modifiers
    temp_item UUID;
BEGIN
    -- 1. Use EXACT provided restaurant ID
    rest_id := 'be1c8d05-bf14-4a48-801b-6919ec42eb15';

    -- 2. Create Categories
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Pizzas', 10) RETURNING id INTO cat_pizza;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'American Beef Burgers', 20) RETURNING id INTO cat_ambf;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Crispy Chicken Burgers', 30) RETURNING id INTO cat_crch;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Vegetarian & Fish Burgers', 40) RETURNING id INTO cat_vgfh;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Gourmet Beef Burgers', 50) RETURNING id INTO cat_grbf;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Grilled Chicken Burgers', 60) RETURNING id INTO cat_grch;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Kebabs', 70) RETURNING id INTO cat_kbbs;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Rio Kebab', 80) RETURNING id INTO cat_riok;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Meat On Chips', 90) RETURNING id INTO cat_mtch;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Kebab Wraps', 100) RETURNING id INTO cat_kbwr;

    -- 3. Create Modifier Groups (Global customization options)
    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'Pizza Toppings', false, true, 0, null) RETURNING id INTO mg_pizza_toppings;

    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'Stuffed Crust', false, false, 0, 1) RETURNING id INTO mg_pizza_crust;

    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'Make it a Meal (+ £1.99)', false, false, 0, 1) RETURNING id INTO mg_make_meal;

    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'Choice of Bun', true, false, 1, 1) RETURNING id INTO mg_bun_choice;

    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'Extra Patty', false, false, 0, 1) RETURNING id INTO mg_extra_patty;

    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'Choose Your Salad', false, true, 0, null) RETURNING id INTO mg_salad;

    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection) 
    VALUES (rest_id, 'Choose Your Sauces', false, true, 0, null) RETURNING id INTO mg_sauce;

    -- 4. Populate Modifier Items
    -- Meal Modifiers
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES (mg_make_meal, 'Add Chips & Drink', 1.99);
    
    -- Extra Patty
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES (mg_extra_patty, 'Add Extra Patty', 1.99);

    -- Buns
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES (mg_bun_choice, 'Brioche Bun', 0.00);
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES (mg_bun_choice, 'Seeded Bun', 0.00);

    -- Salads
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES 
    (mg_salad, 'Lettuce', 0), (mg_salad, 'Tomato', 0), (mg_salad, 'Onion', 0), (mg_salad, 'Cucumber', 0), (mg_salad, 'Red Cabbage', 0), (mg_salad, 'Pickled Chilli', 0), (mg_salad, 'Lemon', 0);

    -- Sauces
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment) VALUES 
    (mg_sauce, 'Homemade Chilli Sauce', 0), (mg_sauce, 'Garlic Sauce', 0), (mg_sauce, 'Mayonnaise', 0), (mg_sauce, 'BBQ Sauce', 0), (mg_sauce, 'Burger Sauce', 0), (mg_sauce, 'Ketchup', 0), (mg_sauce, 'Mint Yogurt', 0);

    -- Pizza Toppings (Price logic based EXACTLY on variant sizes mapping to grid)
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_matrix) VALUES 
    (mg_pizza_toppings, 'Extra Cheese', '{"Medium 10-inch": 1.00, "Large 12-inch": 1.50, "X-Large 14-inch": 2.00, "Super 16-inch": 2.50}'),
    (mg_pizza_toppings, 'Pineapple', '{"Medium 10-inch": 1.00, "Large 12-inch": 1.50, "X-Large 14-inch": 2.00, "Super 16-inch": 2.50}'),
    (mg_pizza_toppings, 'Pepperoni', '{"Medium 10-inch": 1.00, "Large 12-inch": 1.50, "X-Large 14-inch": 2.00, "Super 16-inch": 2.50}');

    -- Stuffed Crust
    INSERT INTO menu_modifier_items (modifier_group_id, name, price_matrix) VALUES 
    (mg_pizza_crust, 'Stuffed Crust', '{"Medium 10-inch": 1.50, "Large 12-inch": 2.00, "X-Large 14-inch": 2.50, "Super 16-inch": 3.00}');


    -- 5. Insert Actual Menu Items and link them to Modifier Groups

    -- == PIZZAS ==
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '01. American Hot', 'Pepperoni, spicy beef, red onion, green pepper & green chillies', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '02. Beefeater', 'Red onion, mushroom & beef', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- == AMERICAN BEEF BURGERS ==
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_ambf, 'BBQ Special', 'Red onion, BBQ sauce, Turkey rashers and lettuce', 5.49,
    '[{"name": "4oz", "price": 5.49}, {"name": "8oz", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);

    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_ambf, 'Chef''s Favourite', 'Delicious yellow mayonnaise, Turkey rashers, onion, tomato and gherkin', 5.49,
    '[{"name": "4oz", "price": 5.49}, {"name": "8oz", "price": 6.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal);

    -- == GOURMET BEEF BURGERS ==
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_grbf, 'Classic (Gourmet)', 'Red onion, BBQ sauce, Turkey rashers and lettuce.', 6.49,
    '[{"name": "6oz", "price": 6.49}, {"name": "12oz", "price": 8.49}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_bun_choice), (temp_item, mg_extra_patty), (temp_item, mg_make_meal);

    -- == KEBABS ==
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_kbbs, 'Lamb Doner', 'Slices of boneless lamb specially marinated, grilled on upright skewer.', 7.49,
    '[{"name": "Medium", "price": 7.49}, {"name": "Large", "price": 8.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_salad), (temp_item, mg_sauce), (temp_item, mg_make_meal);

    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_kbbs, 'Chicken Doner', 'Slices of boneless chicken specially marinated, grilled on upright skewer.', 7.49,
    '[{"name": "Medium", "price": 7.49}, {"name": "Large", "price": 8.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_salad), (temp_item, mg_sauce), (temp_item, mg_make_meal);

    -- == WRAPS ==
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price) VALUES 
    (rest_id, cat_kbwr, 'Lamb Doner Wrap', 'Lettuce, tomato, onion, cucumber, red cabbage, and white cabbage.', 5.99) RETURNING id INTO temp_item;
    -- Just linked to standard modifiers, no size variants because Wraps only have one base price!
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_salad), (temp_item, mg_sauce), (temp_item, mg_make_meal);

END $$;
