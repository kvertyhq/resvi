-- Add max_delivery_order_value to restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS max_delivery_order_value FLOAT DEFAULT 1000.0;
