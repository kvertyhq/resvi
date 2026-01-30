-- Create held_orders table and RPC functions
-- This allows managers to temporarily save orders during checkout

-- Create held_orders table
CREATE TABLE IF NOT EXISTS held_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurant_settings(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Order details
    items JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount_type TEXT,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
        
    -- Metadata
    order_type TEXT NOT NULL CHECK (order_type IN ('walkin', 'table')),
    table_id UUID REFERENCES table_info(id) ON DELETE SET NULL,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_held_orders_restaurant ON held_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_held_orders_created ON held_orders(created_at);

-- RLS Policies
ALTER TABLE held_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view held orders for their restaurant"
    ON held_orders FOR SELECT
    USING (restaurant_id IN (
        SELECT id FROM restaurant_settings WHERE id = restaurant_id
    ));

CREATE POLICY "Users can insert held orders for their restaurant"
    ON held_orders FOR INSERT
    WITH CHECK (restaurant_id IN (
        SELECT id FROM restaurant_settings WHERE id = restaurant_id
    ));

CREATE POLICY "Users can delete held orders for their restaurant"
    ON held_orders FOR DELETE
    USING (restaurant_id IN (
        SELECT id FROM restaurant_settings WHERE id = restaurant_id
    ));

-- Create held order RPC function
CREATE OR REPLACE FUNCTION create_held_order(
    p_restaurant_id UUID,
    p_staff_id UUID,
    p_customer_id UUID,
    p_items JSONB,
    p_subtotal DECIMAL,
    p_discount_type TEXT,
    p_discount_amount DECIMAL,
    p_tax DECIMAL,
    p_total DECIMAL,
    p_order_type TEXT,
    p_table_id UUID,
    p_notes TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_held_order_id UUID;
BEGIN
    INSERT INTO held_orders (
        restaurant_id, staff_id, customer_id,
        items, subtotal, discount_type, discount_amount,
        tax, total, order_type, table_id, notes
    ) VALUES (
        p_restaurant_id, p_staff_id, p_customer_id,
        p_items, p_subtotal, p_discount_type, p_discount_amount,
        p_tax, p_total, p_order_type, p_table_id, p_notes
    )
    RETURNING id INTO v_held_order_id;
    
    RETURN json_build_object(
        'success', true,
        'held_order_id', v_held_order_id
    );
END;
$$;

-- Get held orders RPC function
CREATE OR REPLACE FUNCTION get_held_orders(
    p_restaurant_id UUID
) RETURNS TABLE (
    id UUID,
    customer_name TEXT,
    items JSONB,
    total DECIMAL,
    order_type TEXT,
    table_name TEXT,
    created_at TIMESTAMPTZ,
    staff_name TEXT,
    discount_type TEXT,
    discount_amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ho.id,
        COALESCE(u.full_name, 'Walk-in Customer') as customer_name,
        ho.items,
        ho.total,
        ho.order_type,
        t.table_name,
        ho.created_at,
        s.full_name as staff_name,
        ho.discount_type,
        ho.discount_amount
    FROM held_orders ho
    LEFT JOIN profiles u ON ho.customer_id = u.id
    LEFT JOIN table_info t ON ho.table_id = t.id
    LEFT JOIN profiles s ON ho.staff_id = s.id
    WHERE ho.restaurant_id = p_restaurant_id
    ORDER BY ho.created_at DESC;
END;
$$;

-- Delete held order RPC function
CREATE OR REPLACE FUNCTION delete_held_order(
    p_held_order_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM held_orders WHERE id = p_held_order_id;
    
    RETURN json_build_object('success', true);
END;
$$;
