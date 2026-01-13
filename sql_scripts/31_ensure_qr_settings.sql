-- Ensure enable_qr_ordering column exists
ALTER TABLE restaurant_settings
ADD COLUMN IF NOT EXISTS enable_qr_ordering BOOLEAN DEFAULT true;
