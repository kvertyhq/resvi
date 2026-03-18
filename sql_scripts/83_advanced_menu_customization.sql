-- Migration: Advanced Menu Customization (Pizza System)
-- Adds support for sizes (price variants), fractional toppings (coverage), and intensity levels.

-- 1. Add price_variants to menu_items (e.g. [{"name": "Small", "price": 10.00}, ...])
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS price_variants JSONB DEFAULT '[]'::jsonb;

-- 2. Add price_matrix to menu_modifier_items (e.g. {"Small": 0.50, "Medium": 0.75, "Large": 1.00})
ALTER TABLE menu_modifier_items 
ADD COLUMN IF NOT EXISTS price_matrix JSONB DEFAULT '{}'::jsonb;

-- 3. Add intensity and location defaults documentation (stored in order_items.selected_modifiers)
-- This is a documentation comment as the column is already JSONB.
-- selected_modifiers schema: 
-- [
--   {
--     "id": "item_id", 
--     "name": "Pepperoni", 
--     "price": 1.00, 
--     "location": "whole|left|right", 
--     "intensity": "light|normal|extra|double"
--   }
-- ]

-- 4. Update existing functions if necessary (rpc calls often return full rows, so they might pick these up automatically)
-- If we have a specific RPC for fetching modifiers, we might need to verify it.
