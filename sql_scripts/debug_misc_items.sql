-- Debug query to check if name_snapshot is populated for misc items
-- Run this in Supabase SQL Editor to see the actual data

SELECT 
    oi.id,
    oi.menu_item_id,
    oi.is_miscellaneous,
    oi.custom_item_name,
    oi.name_snapshot,
    mi.name as menu_item_name,
    o.readable_id as order_id
FROM order_items oi
LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
LEFT JOIN orders o ON o.id = oi.order_id
WHERE o.status IN ('pending', 'confirmed', 'preparing', 'ready')
ORDER BY oi.created_at DESC
LIMIT 20;
