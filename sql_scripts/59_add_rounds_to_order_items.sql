-- Migration: Add Round Number to Order Items
-- Description: Adds round_number and fired_at columns to support batching items in a single order.

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS fired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment
COMMENT ON COLUMN order_items.round_number IS 'Batch number for the items (1, 2, 3...) indicating when they were ordered relative to the main order.';
COMMENT ON COLUMN order_items.fired_at IS 'When this specific batch of items was sent to the kitchen.';
