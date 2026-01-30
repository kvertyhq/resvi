-- Migration: Add support for miscellaneous/custom items in order_items
-- Description: Allows POS staff to add custom items with arbitrary names and prices

-- 1. Make menu_item_id nullable (if not already)
ALTER TABLE order_items 
ALTER COLUMN menu_item_id DROP NOT NULL;

-- 2. Add flag to identify miscellaneous items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS is_miscellaneous BOOLEAN DEFAULT false;

-- 3. Add custom name field for miscellaneous items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS custom_item_name TEXT;

-- 4. Add constraint: if is_miscellaneous is true, custom_item_name must be set
ALTER TABLE order_items
ADD CONSTRAINT check_misc_item_name 
CHECK (
    (is_miscellaneous = false OR custom_item_name IS NOT NULL)
);

-- 5. Add comment for documentation
COMMENT ON COLUMN order_items.is_miscellaneous IS 'True if this is a custom/miscellaneous item not from the menu';
COMMENT ON COLUMN order_items.custom_item_name IS 'Custom name for miscellaneous items (required when is_miscellaneous = true)';
