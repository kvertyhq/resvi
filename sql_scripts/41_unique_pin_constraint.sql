-- Enforce unique PIN codes within a restaurant
-- We use a partial unique index to ignore NULLs or empty strings if necessary
-- Assuming pin_code is TEXT

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_restaurant_pin 
ON profiles (restaurant_id, pin_code) 
WHERE pin_code IS NOT NULL AND pin_code <> '';
