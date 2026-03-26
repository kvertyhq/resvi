-- Add Required Burger Bun Modifier to category d2645e0a-1a14-4c17-9ec9-f499d10fc5cd

DO $$ 
DECLARE
    v_category_id UUID := 'd2645e0a-1a14-4c17-9ec9-f499d10fc5cd';
    v_restaurant_id UUID;
    v_mg_id UUID;
    v_brioche_id UUID;
    v_seeded_id UUID;
BEGIN
    -- 1. Find Restaurant ID for this category
    SELECT restaurant_id INTO v_restaurant_id FROM menu_categories WHERE id = v_category_id;
    
    IF v_restaurant_id IS NULL THEN
        RAISE NOTICE 'Category not found or no restaurant associated.';
        RETURN;
    END IF;

    -- 2. Create or find the Modifier Group "BURGER BUN"
    -- Check if it already exists to avoid duplicates
    SELECT id INTO v_mg_id FROM menu_modifiers 
    WHERE restaurant_id = v_restaurant_id AND name = 'BURGER BUN' LIMIT 1;

    IF v_mg_id IS NULL THEN
        INSERT INTO menu_modifiers (restaurant_id, name, is_required, is_multiple, min_selection, max_selection)
        VALUES (v_restaurant_id, 'BURGER BUN', true, false, 1, 1)
        RETURNING id INTO v_mg_id;
    ELSE
        -- Ensure it is required and single select
        UPDATE menu_modifiers 
        SET is_required = true, is_multiple = false, min_selection = 1, max_selection = 1
        WHERE id = v_mg_id;
    END IF;

    -- 3. Add Modifier Items "Brioche" and "Seeded"
    -- Brioche
    SELECT id INTO v_brioche_id FROM menu_modifier_items 
    WHERE modifier_group_id = v_mg_id AND name = 'Brioche' LIMIT 1;
    
    IF v_brioche_id IS NULL THEN
        INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment)
        VALUES (v_mg_id, 'Brioche', 0)
        RETURNING id INTO v_brioche_id;
    END IF;

    -- Seeded
    SELECT id INTO v_seeded_id FROM menu_modifier_items 
    WHERE modifier_group_id = v_mg_id AND name = 'Seeded' LIMIT 1;
    
    IF v_seeded_id IS NULL THEN
        INSERT INTO menu_modifier_items (modifier_group_id, name, price_adjustment)
        VALUES (v_mg_id, 'Seeded', 0)
        RETURNING id INTO v_seeded_id;
    END IF;

    -- 4. Link this group to all menu items in the category
    -- We use a subquery to avoid duplicates in menu_item_modifiers
    INSERT INTO menu_item_modifiers (menu_item_id, modifier_group_id)
    SELECT mi.id, v_mg_id
    FROM menu_items mi
    WHERE mi.category_id = v_category_id
    AND NOT EXISTS (
        SELECT 1 FROM menu_item_modifiers mim 
        WHERE mim.menu_item_id = mi.id AND mim.modifier_group_id = v_mg_id
    );

    RAISE NOTICE 'Burger Bun modifiers applied to category %', v_category_id;
END $$;
