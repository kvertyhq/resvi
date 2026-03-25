-- Migration: Add show_tax flag to restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS show_tax BOOLEAN DEFAULT true;

-- Update get_restaurant_settings if needed (though SELECT * usually handles it)
-- This is just for documentation of the change.
COMMENT ON COLUMN restaurant_settings.show_tax IS 'Toggle to show/hide tax breakdown in receipts, checkout, and POS.';
