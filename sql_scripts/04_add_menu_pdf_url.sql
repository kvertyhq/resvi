-- Add menu_pdf_url to restaurant_settings table
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS menu_pdf_url TEXT;
