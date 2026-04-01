-- Add dynamic image and watermark fields to restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS cover_page_url TEXT DEFAULT 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/734.jpg',
ADD COLUMN IF NOT EXISTS watermark_text TEXT DEFAULT 'Your Name',
ADD COLUMN IF NOT EXISTS menu_image_url TEXT DEFAULT 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/689.jpg',
ADD COLUMN IF NOT EXISTS delivery_image_url TEXT DEFAULT 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/694.jpg',
ADD COLUMN IF NOT EXISTS inside_story_image_url TEXT DEFAULT 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg';
