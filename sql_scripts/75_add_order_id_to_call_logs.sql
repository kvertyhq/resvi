-- Add order_id column to call_logs to link a call directly to the order that was created from it.
-- This allows the POS call history to show "View Order" instead of "Start Order"
-- once an order has been placed from a call.

ALTER TABLE call_logs
    ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_call_logs_order_id ON call_logs(order_id);
