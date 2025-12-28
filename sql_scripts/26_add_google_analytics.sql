-- Add google_analytics_id column to restaurant_settings table
ALTER TABLE "public"."restaurant_settings"
ADD COLUMN IF NOT EXISTS "google_analytics_id" text DEFAULT NULL;
