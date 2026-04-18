-- 127_add_order_index_to_deal_options.sql
-- Add order_index to menu_deal_group_options for persisting choice order

ALTER TABLE menu_deal_group_options 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Optional: Initialize order_index if needed (can be handled by re-saving in admin)
