-- Add caller_id_config to restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS caller_id_config JSONB DEFAULT '{"did": "", "domain": ""}';
