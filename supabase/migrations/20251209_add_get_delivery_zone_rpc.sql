-- Function to find the best matching delivery zone for a given postcode
-- Matches if the input postcode (normalized) EXACTLY matches the stored prefix
CREATE OR REPLACE FUNCTION get_matching_delivery_zone(p_postcode TEXT)
RETURNS SETOF delivery_zones AS $$
DECLARE
  normalized_input TEXT;
BEGIN
  -- Remove whitespace and uppercase to ensure consistent comparison
  normalized_input := upper(regexp_replace(p_postcode, '\s+', '', 'g'));

  RETURN QUERY
  SELECT *
  FROM delivery_zones
  WHERE postcode_prefix = normalized_input
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
