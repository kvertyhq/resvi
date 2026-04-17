-- 126_add_limits_to_deal_options.sql
-- Add min/max selection limits to individual deal group options

ALTER TABLE menu_deal_group_options 
ADD COLUMN IF NOT EXISTS min_selection INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_selection INTEGER DEFAULT NULL;

-- Description: This allows granular control over how many items can be picked 
-- from a specific item search or category choice within a deal group.
