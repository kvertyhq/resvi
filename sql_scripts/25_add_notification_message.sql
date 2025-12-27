-- Add notification_message column to notifications table
ALTER TABLE "public"."notifications"
ADD COLUMN IF NOT EXISTS "notification_message" text DEFAULT NULL;
