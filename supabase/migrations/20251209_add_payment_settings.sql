-- Add payment_settings column to restaurant_settings
-- This will store configuration like { enable_cash: boolean, enable_card: boolean, stripe_config: { ... } }
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{"enable_cash": true, "enable_card": false}'::jsonb;
