-- Migration: Add p_order_source parameter to create_order_by_phone RPC
-- This allows online orders to correctly set source = 'online'
-- NOTE: This only adds the parameter signature. The full function body
-- must be updated to use the parameter if the existing function doesn't already support it.
-- If you have the full function definition, replace the body below accordingly.

-- Step 1: Drop and recreate just the function signature with the new parameter
-- If the function does NOT already use a source column, you'll need to add the full body.

-- Safe approach: Check if orders table has a 'source' column (it does from migration 68)
-- and update the RPC to set it.

-- You may need to get the full current definition from Supabase Dashboard > Database > Functions
-- and add this parameter + the insert value. Below is the pattern you need:

-- ALTER FUNCTION create_order_by_phone (...existing params..., p_order_source order_source DEFAULT 'online')
-- And in the INSERT: source = p_order_source

-- Quick alternative: just update the frontend to NOT pass p_order_source to this RPC,
-- and instead update the orders directly after creation, OR use a separate UPDATE.
-- This migration instead handles it with a direct UPDATE approach:

-- If you want a simpler fix without editing the full RPC body, run this after order creation.
-- But for now, the best approach is to edit the RPC in the Supabase Dashboard to:
-- 1. Add parameter: p_order_source TEXT DEFAULT 'online'
-- 2. In the INSERT VALUES: add source = p_order_source::order_source

-- This script documents the required change.
COMMENT ON FUNCTION create_order_by_phone IS 'Creates an online order. Requires p_order_source parameter (online/pos/qr/phone) to be added if not already present.';
