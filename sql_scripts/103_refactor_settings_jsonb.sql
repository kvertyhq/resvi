-- Refactor settings into theme_settings (colors) and website_settings (media/content)
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS theme_settings JSONB DEFAULT '{
  "header_color": "#333333",
  "button_color": "#c9a96e",
  "theme_color": "#c9a96e"
}'::JSONB,
ADD COLUMN IF NOT EXISTS website_settings JSONB DEFAULT '{
  "watermark_text": "Daniel Sushi",
  "cover_page_url": "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/734.jpg",
  "menu_image_url": "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/689.jpg",
  "delivery_image_url": "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/694.jpg",
  "inside_story_image_url": "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg"
}'::JSONB;

-- Migrate existing data into the new JSONB columns
DO $$ 
BEGIN
    UPDATE restaurant_settings
    SET 
        theme_settings = jsonb_build_object(
            'header_color', COALESCE(header_color, theme_settings->>'header_color'),
            'button_color', COALESCE(button_color, theme_settings->>'button_color'),
            'theme_color', COALESCE(theme_color, theme_settings->>'theme_color')
        ),
        website_settings = jsonb_build_object(
            'watermark_text', COALESCE(watermark_text, website_settings->>'watermark_text'),
            'cover_page_url', COALESCE(cover_page_url, website_settings->>'cover_page_url'),
            'menu_image_url', COALESCE(menu_image_url, website_settings->>'menu_image_url'),
            'delivery_image_url', COALESCE(delivery_image_url, website_settings->>'delivery_image_url'),
            'inside_story_image_url', COALESCE(inside_story_image_url, website_settings->>'inside_story_image_url')
        );
EXCEPTION 
    WHEN undefined_column THEN 
        NULL;
END $$;
