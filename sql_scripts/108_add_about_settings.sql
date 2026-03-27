-- Add about page settings to website_settings
UPDATE restaurant_settings
SET website_settings = jsonb_set(
    jsonb_set(
        COALESCE(website_settings, '{}'::jsonb),
        '{about_image_url}',
        '"https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg"'
    ),
    '{about_subtitle}',
    '"Passion on a Plate"'
)
WHERE website_settings->>'about_subtitle' IS NULL;
