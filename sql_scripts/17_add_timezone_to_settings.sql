-- Add timezone column to restaurant_settings
-- Default to 'UTC' if not specified

ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Comment on column
COMMENT ON COLUMN restaurant_settings.timezone IS 'The IANA timezone identifier for the restaurant (e.g., America/New_York)';
