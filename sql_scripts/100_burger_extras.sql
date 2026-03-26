-- Ensure unique constraint exists for modifier items within a group
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'menu_modifier_items_group_name_key'
    ) THEN
        ALTER TABLE menu_modifier_items ADD CONSTRAINT menu_modifier_items_group_name_key UNIQUE (modifier_group_id, name);
    END IF;
END $$;

-- 1. Create the Modifier Group
DO $$
DECLARE
    v_restaurant_id UUID := 'be1c8d05-bf14-4a48-801b-6919ec42eb15'; -- From .env.local
    v_group_id UUID;
BEGIN
    INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection)
    VALUES (v_restaurant_id, 'Burger Extras', false, true, 0, NULL)
    ON CONFLICT (id) DO NOTHING; -- We'll find it by name if it already exists
END $$;

-- 2. Add the Items
WITH group_id AS (
    SELECT id FROM menu_modifiers WHERE name = 'Burger Extras' AND restaurant_id = 'be1c8d05-bf14-4a48-801b-6919ec42eb15' LIMIT 1
)
INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment, is_available)
SELECT group_id.id, items.name, items.price, true
FROM group_id, (VALUES
    ('Turkey Rushers', 0.80),
    ('3 PCS Onion Rings', 0.80),
    ('Onion', 0.50),
    ('Pickle Chilli', 0.50),
    ('Red Onion', 0.50),
    ('Fried Onion', 0.50),
    ('Egg', 1.00),
    ('Chilli Con Carne', 0.80),
    ('Hash Brown', 0.80),
    ('Fried Mushroom', 0.80),
    ('Tomato', 0.50),
    ('Lettuce', 0.50),
    ('Gherkin', 0.50),
    ('Jalapeno', 0.50),
    ('Cheese', 1.00),
    ('Extra Patty', 1.99)
) AS items(name, price)
ON CONFLICT (modifier_group_id, name) DO UPDATE SET price_adjustment = EXCLUDED.price_adjustment;

-- 3. Link to Categories
WITH group_id AS (
    SELECT id FROM menu_modifiers WHERE name = 'Burger Extras' AND restaurant_id = 'be1c8d05-bf14-4a48-801b-6919ec42eb15' LIMIT 1
)
INSERT INTO menu_category_modifiers (category_id, modifier_group_id, order_index)
SELECT mc.id, group_id.id, 10
FROM menu_categories mc, group_id
WHERE mc.name IN (
    'AMERICAN BEEF BURGERS',
    'CRISPY CHICKEN BURGERS',
    'VEGETARIAN & FISH BURGERS',
    'GOURMET BEEF BURGERS',
    'GRILLED CHICKEN BURGERS'
)
AND mc.restaurant_id = 'be1c8d05-bf14-4a48-801b-6919ec42eb15'
ON CONFLICT (category_id, modifier_group_id) DO NOTHING;
