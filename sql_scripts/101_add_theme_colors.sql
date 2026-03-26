-- Add header_color and button_color to restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS header_color VARCHAR(20) DEFAULT '#333333',
ADD COLUMN IF NOT EXISTS button_color VARCHAR(20) DEFAULT '#c9a96e';

COMMENT ON COLUMN restaurant_settings.header_color IS 'Background color for the website header.';
COMMENT ON COLUMN restaurant_settings.button_color IS 'Primary action color for buttons throughout the website.';
