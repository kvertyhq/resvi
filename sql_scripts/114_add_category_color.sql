-- Add color column to menu_categories
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS color TEXT;

-- Optional: Seed some default colors for existing categories if desired
-- UPDATE menu_categories SET color = '#3b82f6' WHERE name ILIKE '%drink%';
-- UPDATE menu_categories SET color = '#ef4444' WHERE name ILIKE '%pizza%';
