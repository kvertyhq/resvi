-- Add notes column to order_items for special instructions
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS notes TEXT;
