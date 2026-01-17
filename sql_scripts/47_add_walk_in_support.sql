-- Migration: Add Walk-In Order Support
-- Description: Documents usage of existing user_id column for walk-in/takeaway orders

-- The existing user_id column in orders table will be used to link walk-in orders to customer profiles
-- No schema changes needed - just documenting the usage pattern

-- Update comment for documentation
COMMENT ON COLUMN orders.user_id IS 'User/Customer profile reference - used for online orders and walk-in/takeaway orders';

-- Ensure index exists for better query performance (may already exist)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Note: 'draft' status is now a valid order status
-- Draft orders are not sent to kitchen yet
-- Valid statuses: draft, pending, preparing, ready, served, completed, cancelled
