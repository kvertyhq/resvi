
-- 121_add_auto_complete_orders_logic.sql
-- Migration 121: Function to auto-complete stagnant orders (Phone & POS/Walk-in only)

CREATE OR REPLACE FUNCTION auto_complete_stale_orders(p_restaurant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auto_complete_minutes INTEGER;
  v_updated_count INTEGER := 0;
BEGIN
  -- 1. Fetch the auto_complete_minutes from pos_settings
  SELECT (pos_settings->>'auto_complete_minutes')::INTEGER INTO v_auto_complete_minutes
  FROM restaurant_settings
  WHERE id = p_restaurant_id;

  -- 2. If setting is > 0, proceed
  IF v_auto_complete_minutes IS NOT NULL AND v_auto_complete_minutes > 0 THEN
    -- 3. Update active orders older than the threshold
    -- Logic: status IN ('pending', 'confirmed', 'preparing', 'ready')
    -- AND source IN ('phone', 'pos') -- Restricted to Phone and POS/Walk-in as requested
    -- AND (now() - interval 'X minutes') > updated_at (fallback to created_at if updated_at null)
    WITH updated_rows AS (
      UPDATE orders
      SET status = 'completed',
          updated_at = NOW()
      WHERE restaurant_id = p_restaurant_id
        AND status IN ('pending', 'confirmed', 'preparing', 'ready')
        AND source IN ('phone', 'pos')
        AND (
          COALESCE(updated_at, created_at) < (NOW() - (v_auto_complete_minutes * interval '1 minute'))
        )
      RETURNING id
    )
    SELECT count(*) INTO v_updated_count FROM updated_rows;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_complete_stale_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_complete_stale_orders(UUID) TO service_role;
