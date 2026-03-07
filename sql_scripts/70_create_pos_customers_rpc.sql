-- Migration: Create RPC to fetch customers securely for POS
-- Description: Allows POS users (who may be anon) to search and fetch customer profiles

CREATE OR REPLACE FUNCTION get_pos_customers(
    p_restaurant_id UUID,
    p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, full_name TEXT, phone TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_search_query IS NOT NULL AND length(p_search_query) >= 2 THEN
        RETURN QUERY
        SELECT p.id, p.full_name, p.phone
        FROM profiles p
        WHERE p.restaurant_id = p_restaurant_id
        AND p.role = 'customer'
        AND (p.full_name ILIKE '%' || p_search_query || '%' OR p.phone ILIKE '%' || p_search_query || '%')
        ORDER BY p.full_name
        LIMIT 50;
    ELSE
        RETURN QUERY
        SELECT p.id, p.full_name, p.phone
        FROM profiles p
        WHERE p.restaurant_id = p_restaurant_id
        AND p.role = 'customer'
        ORDER BY p.full_name
        LIMIT 200;
    END IF;
END;
$$;

-- Grant execution to both anon and authenticated users
GRANT EXECUTE ON FUNCTION get_pos_customers TO public;
