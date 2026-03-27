-- Add order image to website_settings
UPDATE restaurant_settings
SET website_settings = jsonb_set(
    COALESCE(website_settings, '{}'::jsonb),
    '{order_image_url}',
    '"https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/674.jpg"'
)
WHERE website_settings->>'order_image_url' IS NULL;
