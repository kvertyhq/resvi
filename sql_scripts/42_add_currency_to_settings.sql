ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT '$';

COMMENT ON COLUMN restaurant_settings.currency IS 'Currency symbol (e.g., $, £, €) or code (e.g., USD, GBP) to display in POS.';
