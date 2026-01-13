ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'flat'; -- 'flat' or 'percentage'

COMMENT ON COLUMN orders.discount_amount IS 'Value of the discount applied.';
COMMENT ON COLUMN orders.discount_type IS 'Type of discount: "flat" (e.g. $5) or "percentage" (e.g. 10%).';
