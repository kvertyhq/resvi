-- Migration: Update get_pos_customers to support pagination and total count
-- Description: v2 of the RPC to handle server-side pagination efficiently for the POS Customers tab

CREATE OR REPLACE FUNCTION get_pos_customers_v2(
    p_restaurant_id UUID,
    p_search_query TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (id UUID, full_name TEXT, phone TEXT, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH customer_data AS (
        SELECT p.id, p.full_name, p.phone
        FROM profiles p
        WHERE p.restaurant_id = p_restaurant_id
        AND p.role = 'customer'
        AND (
            p_search_query IS NULL 
            OR p_search_query = '' 
            OR p.full_name ILIKE '%' || p_search_query || '%' 
            OR p.phone ILIKE '%' || p_search_query || '%'
        )
    ),
    count_data AS (
        SELECT COUNT(*) as total FROM customer_data
    )
    SELECT 
        cd.id, cd.full_name, cd.phone, count_data.total
    FROM customer_data cd, count_data
    ORDER BY cd.full_name ASC
    LIMIT p_limit 
    OFFSET p_offset;
END;
$$;

-- Grant execution to public
GRANT EXECUTE ON FUNCTION get_pos_customers_v2 TO public;
