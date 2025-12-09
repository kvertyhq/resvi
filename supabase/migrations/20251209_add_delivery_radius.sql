-- Add max_delivery_radius_miles to restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS max_delivery_radius_miles FLOAT DEFAULT 5.0;
