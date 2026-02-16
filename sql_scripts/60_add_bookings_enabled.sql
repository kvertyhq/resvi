-- Add bookings_enabled column to restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS bookings_enabled BOOLEAN DEFAULT true;

-- Update the existing get_restaurant_settings function if it uses SELECT * it will automatically pick it up, 
-- but if it selects specific columns, we might need to update it. 
-- Based on the codebase search, it seems it's a simple select or RPC.
-- Let's verify if we need to update any types or RPCs.

-- If there's a specific type for restaurant_settings, update it.
-- Assuming standard table structure.
