-- Menu Modifiers Database Setup Script - PART 2
-- Run this AFTER 86_seed_menu_data.sql. 
-- It adds Wraps, Sides, Pastas, Desserts, Drinks, Chips, and massive Meal Deals!

DO $$ 
DECLARE
    rest_id UUID;

    -- New Categories
    cat_chkwr UUID;
    cat_sides UUID;
    cat_pasta UUID;
    cat_dessrt UUID;
    cat_drinks UUID;
    cat_chips UUID;
    cat_kidsmr UUID;
    cat_pzcldl UUID;
    cat_mdeals UUID;

    -- Existing Modifiers to reuse
    mg_make_meal UUID;
    
    -- Temp vars
    temp_item UUID;
BEGIN
    rest_id := 'be1c8d05-bf14-4a48-801b-6919ec42eb15';

    -- 1. Create New Categories
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Chicken Wraps', 110) RETURNING id INTO cat_chkwr;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Side Orders', 120) RETURNING id INTO cat_sides;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Pasta', 130) RETURNING id INTO cat_pasta;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Desserts', 140) RETURNING id INTO cat_dessrt;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Drinks', 150) RETURNING id INTO cat_drinks;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Chips Variety', 160) RETURNING id INTO cat_chips;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Kids Meals', 170) RETURNING id INTO cat_kidsmr;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Pizza Collection Deal', 180) RETURNING id INTO cat_pzcldl;
    INSERT INTO menu_categories (restaurant_id, name, order_index) VALUES (rest_id, 'Mega Deals', 190) RETURNING id INTO cat_mdeals;

    -- Find the Make a Meal modifier group created previously
    SELECT id INTO mg_make_meal FROM menu_modifiers WHERE name = 'Make it a Meal (+ £1.99)' AND restaurant_id = rest_id LIMIT 1;

    -- 2. Populate Normal Menu Items

    -- == CHICKEN WRAPS (Uses price variants for Crispy/Grilled) ==
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_chkwr, 'BBQ Wrap', 'Fried onion, BBQ sauce, fresh lettuce and tomatoes wrapped in a lightly toasted soft tortilla wrap.', 5.99,
    '[{"name": "Crispy Chicken", "price": 5.99}, {"name": "Grilled Chicken", "price": 6.99}]') RETURNING id INTO temp_item;
    IF mg_make_meal IS NOT NULL THEN INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal); END IF;

    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_chkwr, 'Classic Wrap', 'Mayonnaise, fresh lettuce, red onions and tomatoes wrapped in a lightly toasted soft tortilla wrap.', 5.99,
    '[{"name": "Crispy Chicken", "price": 5.99}, {"name": "Grilled Chicken", "price": 6.99}]') RETURNING id INTO temp_item;
    IF mg_make_meal IS NOT NULL THEN INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_make_meal); END IF;

    -- == SIDE ORDERS ==
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_sides, 'Chicken Nuggets (7 pcs)', 3.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_sides, 'Spicy Chicken Dippers (6 pcs)', 5.49);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_sides, 'Garlic Bread (4 pcs)', 3.49);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_sides, 'Onion Rings (10 pcs)', 3.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_sides, 'Three Bites Sauce', 0.50);

    -- == PASTA ==
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_pasta, 'Beef Lasagne', 7.49);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_pasta, 'Chicken & Mushroom Pasta', 7.49);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_pasta, 'Spaghetti Bolognese', 7.49);

    -- == DESSERTS ==
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price) VALUES (rest_id, cat_dessrt, 'Desserts Slice', 'Chocolate Fudge Cake, Banoffee Pie, Strawberry Cheesecake', 3.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price) VALUES (rest_id, cat_dessrt, 'Haagen Dazs', 'Cookies and Cream, Strawberry Cheese Cake & Vanilla', 7.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price) VALUES (rest_id, cat_dessrt, 'Ben & Jerry', 'Caramel Chew Chew, Cookie Dough & Chocolate Fudge Brownie', 7.99);

    -- == DRINKS ==
    INSERT INTO menu_items (restaurant_id, category_id, name, price_variants) VALUES (rest_id, cat_drinks, 'Large Bottles (1.25L - 1.5L)', '[{"name": "Coke 1.25L", "price": 3.99}, {"name": "Diet Coke 1.25L", "price": 3.99}, {"name": "7up 1.5L", "price": 3.99}, {"name": "Pepsi 1.5L", "price": 3.99}, {"name": "Tango 1.5L", "price": 3.99}]');
    INSERT INTO menu_items (restaurant_id, category_id, name, price, description) VALUES (rest_id, cat_drinks, 'Cans of Drinks', 1.49, 'Coke, Diet Coke, Pepsi, 7up, Tango, Dr Pepper, Rubicon Mango/Guava, Mirinda, etc.');
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_drinks, 'Water 500ml', 1.20);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_drinks, 'Kids Drink (Fruit Shoot)', 0.99);

    -- == CHIPS VARIETY ==
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_chips, 'Medium Fries (Plain)', 1.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_chips, 'Large Fries (Plain)', 2.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_chips, 'Cheesy Fries (Medium)', 2.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_chips, 'Peri Peri Fries (Medium)', 2.49);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_chips, 'Curly Fries', 4.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_chips, 'Three Bites Lava Fries', 5.99);

    -- == KIDS MEALS ==
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_kidsmr, 'Chicken Nuggets (4pcs) + Chips', 3.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_kidsmr, 'Chicken Steak Burger + Chips', 3.99);
    INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (rest_id, cat_kidsmr, '7" Pizza with two toppings of your choice', 4.99);

    -- == DEALS ==
    
    -- Pizza Collection Deal
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pzcldl, 'Pizza Collection Only', 'Collection only deal.', 7.99,
    '[{"name": "Med 10\"", "price": 7.99}, {"name": "Lrg 12\"", "price": 8.99}, {"name": "X-Lrg 14\"", "price": 9.99}, {"name": "Sup 16\"", "price": 11.99}]');

    -- Mega Deals
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_mdeals, 'The Broadway Deal', 'Any Pizza, 4pcs Garlic Bread, Any Side Order and a Bottle of Soft Drink', 20.49,
    '[{"name": "Med 10\"", "price": 20.49}, {"name": "Lrg 12\"", "price": 22.49}, {"name": "X-Lrg 14\"", "price": 24.49}, {"name": "Sup 16\"", "price": 26.49}]');

    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_mdeals, 'The Hungry Guys Deal', 'Any Large Pizza, 4pcs Garlic Bread, & 2 Cans of Soft Drink', 17.49,
    '[{"name": "Large 12-inch", "price": 17.49}]');

    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_mdeals, 'The Two Guys Deal', 'Any two Pizzas, 4pcs Garlic Bread, One Side Order and a Bottle of Soft Drink', 24.99,
    '[{"name": "2 x Med 10\"", "price": 24.99}, {"name": "2 x Lrg 12\"", "price": 28.99}, {"name": "2 x X-Lrg 14\"", "price": 32.99}, {"name": "2 x Sup 16\"", "price": 36.99}]');

    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_mdeals, 'The Double Deal', 'Any two Pizzas', 18.99,
    '[{"name": "2 x Med 10\"", "price": 18.99}, {"name": "2 x Lrg 12\"", "price": 21.99}, {"name": "2 x X-Lrg 14\"", "price": 23.99}, {"name": "2 x Sup 16\"", "price": 27.99}]');

    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_mdeals, 'The Party Deal', 'Any three Pizzas', 26.99,
    '[{"name": "3 x Med 10\"", "price": 26.99}, {"name": "3 x Lrg 12\"", "price": 29.99}, {"name": "3 x X-Lrg 14\"", "price": 32.99}, {"name": "3 x Sup 16\"", "price": 38.99}]');

END $$;
