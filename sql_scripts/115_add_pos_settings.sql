-- Migration 115: Add POS settings configuration to restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS pos_settings JSONB DEFAULT '{"show_kds": true, "show_reports": true, "show_calls": true}'::JSONB;

-- Comment for clarity
COMMENT ON COLUMN restaurant_settings.pos_settings IS 'JSON configuration for POS feature visibility (e.g., KDS, Reports, Calls)';
