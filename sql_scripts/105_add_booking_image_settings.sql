-- Add booking image to website_settings
UPDATE restaurant_settings
SET website_settings = jsonb_set(
    COALESCE(website_settings, '{}'::jsonb),
    '{booking_image_url}',
    '"https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/684.jpg"'
)
WHERE website_settings->>'booking_image_url' IS NULL;
