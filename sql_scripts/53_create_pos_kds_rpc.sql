-- Create secure function to fetch KDS orders with nested data
-- Returns JSON to guarantee structure and bypass RLS on joined tables

CREATE OR REPLACE FUNCTION get_pos_kds_orders(p_restaurant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', o.id,
      'readable_id', o.readable_id,
      'table_id', o.table_id,
      'status', o.status,
      'created_at', o.created_at,
      'order_type', o.order_type,
      'table_info', (
        SELECT json_build_object(
          'table_name', t.table_name
        ) 
        FROM table_info t 
        WHERE t.id = o.table_id
      ),
      'order_items', (
        SELECT coalesce(json_agg(
          json_build_object(
            'id', oi.id,
            'quantity', oi.quantity,
            'notes', oi.notes,
            'course_name', oi.course_name,
            'selected_modifiers', oi.selected_modifiers,
            'menu_items', (
               SELECT json_build_object(
                 'name', mi.name,
                 'category_id', mi.category_id,
                 'menu_categories', (
                    SELECT json_build_object('station', mc.station) 
                    FROM menu_categories mc 
                    WHERE mc.id = mi.category_id
                 )
               )
               FROM menu_items mi
               WHERE mi.id = oi.menu_item_id
            )
          )
        ), '[]'::json)
        FROM order_items oi
        WHERE oi.order_id = o.id
      )
    ) ORDER BY o.created_at ASC
  ) INTO result
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
  AND o.status IN ('pending', 'confirmed', 'preparing', 'ready');

  -- Return empty array if no orders found (json_agg returns null if 0 rows)
  RETURN coalesce(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_pos_kds_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_kds_orders(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_pos_kds_orders(UUID) TO service_role;
