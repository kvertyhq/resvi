-- ============================================================
-- 96: Add default topping support to menu_items and order_items
-- ============================================================

-- Stores an array of menu_modifier_item UUIDs that come
-- pre-loaded on the menu item (e.g. Pepperoni, Beef on a BBQ Pizza)
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS default_topping_ids JSONB DEFAULT '[]'::jsonb;

-- Records which toppings were excluded and any replacements chosen
-- Format: [{ "id": "...", "name": "Pepperoni", "replacement": { "id": "...", "name": "Chicken Tikka" } }]
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS excluded_toppings JSONB DEFAULT '[]'::jsonb;
