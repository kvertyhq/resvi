ALTER TABLE menu_categories
ADD COLUMN IF NOT EXISTS station TEXT CHECK (station IN ('kitchen', 'bar')) DEFAULT 'kitchen';

-- Try to auto-assign Drinks to station 'bar'
UPDATE menu_categories SET station = 'bar' WHERE name ILIKE '%drink%' OR name ILIKE '%beverage%' OR name ILIKE '%cocktail%' OR name ILIKE '%wine%' OR name ILIKE '%beer%';
