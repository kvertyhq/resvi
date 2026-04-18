-- Add order_index to menu_modifiers table to allow manual reordering
ALTER TABLE menu_modifiers
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
