-- Create receipt_settings table
CREATE TABLE IF NOT EXISTS receipt_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurant_settings(id) ON DELETE CASCADE NOT NULL,
  header_text TEXT,
  footer_text TEXT,
  show_logo BOOLEAN DEFAULT true,
  logo_url TEXT,
  custom_css TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_restaurant_receipt_settings UNIQUE (restaurant_id)
);

-- RLS Policies
ALTER TABLE receipt_settings ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access to receipt_settings"
  ON receipt_settings FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service Role (and simplified POS access via RPC)
-- We will rely on RPC for POS read access to be safe/simple

-- RPC to get settings securely
CREATE OR REPLACE FUNCTION get_receipt_settings(p_restaurant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'header_text', header_text,
    'footer_text', footer_text,
    'show_logo', show_logo,
    'logo_url', logo_url,
    'custom_css', custom_css
  ) INTO result
  FROM receipt_settings
  WHERE restaurant_id = p_restaurant_id;

  RETURN result;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON receipt_settings TO authenticated;
GRANT SELECT ON receipt_settings TO anon; -- Needed for migration applies generally, but strict RLS handles access
GRANT EXECUTE ON FUNCTION get_receipt_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_receipt_settings(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_receipt_settings(UUID) TO service_role;
