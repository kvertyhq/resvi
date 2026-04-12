-- Migration: Add ingredient_name to menu_item_replacers
-- This allows each replacer link to have a named ingredient (e.g., "Cheese", "Onion")
-- so the POS can show "No Cheese → [options from replacer group]"

-- Step 1: Add ingredient_name column (required for new entries, nullable for migration of existing rows)
ALTER TABLE menu_item_replacers ADD COLUMN IF NOT EXISTS ingredient_name TEXT;

-- Step 2: Drop the unique constraint that prevents multiple ingredients from sharing a replacer group
ALTER TABLE menu_item_replacers DROP CONSTRAINT IF EXISTS menu_item_replacers_menu_item_id_replacer_group_id_key;
