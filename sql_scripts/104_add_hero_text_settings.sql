-- Add hero title and subtitle to website_settings
UPDATE restaurant_settings
SET website_settings = jsonb_set(
    jsonb_set(
        COALESCE(website_settings, '{}'::jsonb),
        '{hero_title}',
        '"Fuel Your Mood. Feed Your Cravings."'
    ),
    '{hero_subtitle}',
    '"Indulge in mood-boosting sushi and expertly prepared steaks—made with high-quality ingredients and chef precision."'
)
WHERE website_settings->>'hero_title' IS NULL;
