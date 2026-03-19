-- Script to add the remaining pizzas (03 to 23) from the menu to the "Pizzas" category.
-- Associates each with the existing Pizza Toppings and Stuffed Crust modifier groups.

DO $$ 
DECLARE
    rest_id UUID := 'be1c8d05-bf14-4a48-801b-6919ec42eb15';
    cat_pizza UUID;
    mg_pizza_toppings UUID;
    mg_pizza_crust UUID;
    temp_item UUID;
BEGIN
    -- 1. Get Category ID
    SELECT id INTO cat_pizza FROM menu_categories WHERE restaurant_id = rest_id AND name = 'Pizzas' LIMIT 1;
    
    -- 2. Get Modifier Group IDs
    SELECT id INTO mg_pizza_toppings FROM menu_modifiers WHERE restaurant_id = rest_id AND name = 'Pizza Toppings' LIMIT 1;
    SELECT id INTO mg_pizza_crust FROM menu_modifiers WHERE restaurant_id = rest_id AND name = 'Stuffed Crust' LIMIT 1;

    IF cat_pizza IS NULL THEN
        RAISE EXCEPTION 'Category Pizzas not found. Please ensure 86_seed_menu_data.sql has been run.';
    END IF;

    -- 3. Insert Remaining Pizzas

    -- 03. BBQ pizza
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '03. BBQ pizza', 'BBQ sauce, red onion, green pepper, turkey bacon & roast chicken', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 04. BBQ Hot Pizza
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '04. BBQ Hot Pizza', 'BBQ sauce, onion, sweetcorn, roast chicken & jalapeños', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 05. Chicken Tandoori Pizza
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '05. Chicken Tandoori Pizza', 'tandoori chicken, green pepper, mushroom & jalapeños', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 06. Chicken Supreme
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '06. Chicken Supreme', 'roast chicken, mushroom, sweetcorn & green pepper', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 07. Chicken Tikka Pizza
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '07. Chicken Tikka Pizza', 'chicken tikka, mushroom, red onion, green pepper & jalapeños', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 08. Chicken Choice
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '08. Chicken Choice', 'double roast chicken & cheese', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 09. Create your own
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '09. Create your own', 'four topping of your choice', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 10. Hawaiian
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '10. Hawaiian', 'turkey ham & pineapple', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 11. Hot Tuna
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '11. Hot Tuna', 'tuna, red onion, fresh tomatoes, black olives, sweetcorn & green chilli', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 12. Kebab Pizza
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '12. Kebab Pizza', 'Red onion, doner kebab meat and dried oregano', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 13. Margherita
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '13. Margherita', 'cheese & tomatoes', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 14. Mexican Chicken
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '14. Mexican Chicken', 'Mexican chicken, red onion, green pepper & fresh tomatoes', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 15. Meat House
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '15. Meat House', 'Turkey ham, beef, pepperoni, sausage & turkey bacon', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 16. Pepperoni Plus
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '16. Pepperoni Plus', 'extra pepperoni & extra cheese', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 17. Peri Peri Chicken
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '17. Peri Peri Chicken', 'peri peri chicken, onion, green pepper & mushroom', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 18. Seafood
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '18. Seafood', 'tuna, prawns, anchovies & fresh tomatoes', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 19. Three Bites Special
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '19. Three Bites Special', 'red onion, mushroom, green pepper, turkey ham, beef, pepperoni & sweetcorn', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 20. Vegetarian
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '20. Vegetarian', 'red onion, mushroom, green pepper, sweetcorn & fresh tomatoes', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 21. Vegetarian Hot
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '21. Vegetarian Hot', 'onion, mushroom, sweetcorn, green pepper, fresh tomatoes & green chillies', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 22. Vegetarian Deluxe
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '22. Vegetarian Deluxe', 'red onion, fresh tomatoes, mushrooms & black olives', 11.99,
    '[{"name": "Medium 10-inch", "price": 11.99}, {"name": "Large 12-inch", "price": 13.99}, {"name": "X-Large 14-inch", "price": 15.99}, {"name": "Super 16-inch", "price": 17.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

    -- 23. Paneer Pizza (£1 extra) => Base price increased to 12.99
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, price_variants) VALUES 
    (rest_id, cat_pizza, '23. Paneer Pizza', 'red onion, sweetcorn, green chillies, green peppers & paneer', 12.99,
    '[{"name": "Medium 10-inch", "price": 12.99}, {"name": "Large 12-inch", "price": 14.99}, {"name": "X-Large 14-inch", "price": 16.99}, {"name": "Super 16-inch", "price": 18.99}]') RETURNING id INTO temp_item;
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id) VALUES (temp_item, mg_pizza_toppings), (temp_item, mg_pizza_crust);

END $$;
