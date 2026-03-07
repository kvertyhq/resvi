-- Migration: Add Order Source Enum and Column
-- Description: Adds a new column to track the source of the order (online, pos, qr, phone)

-- 1. Create the enum type
DO $$ BEGIN
    CREATE TYPE order_source AS ENUM ('online', 'pos', 'qr', 'phone');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add the column to the orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS source order_source DEFAULT 'pos';

-- 3. Update existing orders to 'pos' (already handled by default, but to be sure)
UPDATE orders SET source = 'pos' WHERE source IS NULL;

-- 4. Add index for performance in filtering
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);
