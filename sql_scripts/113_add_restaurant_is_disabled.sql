-- Add 'is_disabled' column to lock restaurant login out of Admin and POS (but keep website active)
ALTER TABLE "public"."restaurant_settings" 
ADD COLUMN IF NOT EXISTS "is_disabled" BOOLEAN DEFAULT false;
