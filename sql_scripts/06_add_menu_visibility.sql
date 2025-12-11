-- Add is_menu_pdf_visible to restaurant_settings table
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS is_menu_pdf_visible BOOLEAN DEFAULT true;
