-- Redefine get_restaurant_settings to ensure it returns all columns including timeslot_capacities
CREATE OR REPLACE FUNCTION get_restaurant_settings(p_id UUID)
RETURNS SETOF restaurant_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM restaurant_settings
    WHERE id = p_id;
END;
$$;
