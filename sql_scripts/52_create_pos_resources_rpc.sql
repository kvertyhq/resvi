-- Secure functions to fetch floors and tables for POS
-- These run as SECURITY DEFINER to bypass RLS for authenticated/anon POS users

-- 1. Get Floors
CREATE OR REPLACE FUNCTION get_pos_floors(p_restaurant_id UUID)
RETURNS SETOF restaurant_floors
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM restaurant_floors
  WHERE restaurant_id = p_restaurant_id
  ORDER BY order_index;
END;
$$;

-- 2. Get Tables
CREATE OR REPLACE FUNCTION get_pos_tables(p_restaurant_id UUID)
RETURNS SETOF table_info
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM table_info
  WHERE restaurant_id = p_restaurant_id
  ORDER BY table_name;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_pos_floors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_floors(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_pos_floors(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION get_pos_tables(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_tables(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_pos_tables(UUID) TO service_role;
