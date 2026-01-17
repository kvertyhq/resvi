-- Create a secure function to login POS users
-- This function runs with SECURITY DEFINER privileges to check profiles table
-- without exposing the table to the client directly

CREATE OR REPLACE FUNCTION pos_login(
  p_restaurant_id UUID,
  p_pin_code TEXT
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  role TEXT,
  restaurant_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return the matching profile if found
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.role::text,
    p.restaurant_id
  FROM profiles p
  WHERE p.restaurant_id = pos_login.p_restaurant_id
  AND p.pin_code = pos_login.p_pin_code
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users (and anon if needed for initial check, though usually POS is behind auth or anon-key capable)
GRANT EXECUTE ON FUNCTION pos_login(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION pos_login(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION pos_login(UUID, TEXT) TO service_role;
