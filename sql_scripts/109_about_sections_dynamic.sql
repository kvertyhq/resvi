-- Add dynamic about sections to website_settings
UPDATE restaurant_settings
SET website_settings = jsonb_set(
    COALESCE(website_settings, '{}'::jsonb),
    '{about_sections}',
    '[
        {
            "title": "Our Philosophy",
            "content": "Good food means good mood. The health benefits of eating Daniel Sushi are surprisingly great as it meets the daily nutrition requirements and fulfills the sudden hunger for complete comfort food that you can have.\n\nWe believe in using only the freshest ingredients to create dishes that not only taste amazing but also make you feel good.",
            "image_url": "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/689.jpg"
        },
        {
            "title": "The Steak Experience",
            "content": "Steak Feast - Not your typical steak food. Our highly trained chefs and the high quality meat will convince even the most demanding steak lovers. Try with steamed rice for great taste.\n\nEvery cut is carefully selected and prepared to perfection, ensuring a dining experience that is both memorable and satisfying.",
            "image_url": "https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/694.jpg"
        }
    ]'::jsonb
)
WHERE website_settings->>'about_sections' IS NULL;
