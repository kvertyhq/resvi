-- Add print mode to receipt settings
-- This allows restaurants to configure automatic printing behavior

-- Create enum type for print modes
DO $$ BEGIN
    CREATE TYPE print_mode_enum AS ENUM ('auto_with_drawer', 'auto_no_drawer', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add print_mode column to receipt_settings
ALTER TABLE receipt_settings 
ADD COLUMN IF NOT EXISTS print_mode print_mode_enum DEFAULT 'manual';

-- Update get_receipt_settings RPC to include print_mode
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
    'custom_css', custom_css,
    'print_mode', print_mode
  ) INTO result
  FROM receipt_settings
  WHERE restaurant_id = p_restaurant_id;

  RETURN result;
END;
$$;

-- Update upsert_receipt_settings RPC to handle print_mode
CREATE OR REPLACE FUNCTION upsert_receipt_settings(
  p_restaurant_id UUID,
  p_header_text TEXT,
  p_footer_text TEXT,
  p_show_logo BOOLEAN,
  p_logo_url TEXT,
  p_custom_css TEXT,
  p_print_mode print_mode_enum DEFAULT 'manual'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO receipt_settings (
    restaurant_id,
    header_text,
    footer_text,
    show_logo,
    logo_url,
    custom_css,
    print_mode,
    updated_at
  )
  VALUES (
    p_restaurant_id,
    p_header_text,
    p_footer_text,
    p_show_logo,
    p_logo_url,
    p_custom_css,
    p_print_mode,
    NOW()
  )
  ON CONFLICT (restaurant_id)
  DO UPDATE SET
    header_text = EXCLUDED.header_text,
    footer_text = EXCLUDED.footer_text,
    show_logo = EXCLUDED.show_logo,
    logo_url = EXCLUDED.logo_url,
    custom_css = EXCLUDED.custom_css,
    print_mode = EXCLUDED.print_mode,
    updated_at = NOW();
END;
$$;
