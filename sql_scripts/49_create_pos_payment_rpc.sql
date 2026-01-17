-- Migration: Create POS Payment RPC Function
-- Description: RPC function for processing POS payments with validation and status updates

-- Create or replace the payment processing function
CREATE OR REPLACE FUNCTION process_pos_payment(
    p_order_id UUID,
    p_amount DECIMAL,
    p_payment_method TEXT,
    p_staff_id UUID,
    p_transaction_id TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_order RECORD;
    v_payment_id UUID;
    v_total_paid DECIMAL;
    v_result JSON;
BEGIN
    -- Get order details
    SELECT * INTO v_order 
    FROM orders 
    WHERE id = p_order_id;
    
    -- Validate order exists
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid payment amount';
    END IF;
    
    -- Validate payment method
    IF p_payment_method NOT IN ('cash', 'card', 'online') THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;
    
    -- Insert payment record
    INSERT INTO payments (
        order_id,
        amount,
        payment_method,
        transaction_id,
        status,
        created_by,
        created_at
    ) VALUES (
        p_order_id,
        p_amount,
        p_payment_method,
        p_transaction_id,
        'completed',
        p_staff_id,
        NOW()
    ) RETURNING id INTO v_payment_id;
    
    -- Calculate total paid amount
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE order_id = p_order_id 
    AND status = 'completed';
    
    -- Update order payment status
    IF v_total_paid >= v_order.total_amount THEN
        -- Fully paid
        UPDATE orders 
        SET payment_status = 'paid',
            status = CASE 
                WHEN status IN ('ready', 'served') THEN 'completed'
                ELSE status 
            END,
            updated_at = NOW()
        WHERE id = p_order_id;
    ELSE
        -- Partially paid
        UPDATE orders 
        SET payment_status = 'partial',
            updated_at = NOW()
        WHERE id = p_order_id;
    END IF;
    
    -- Build result JSON
    SELECT json_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'total_paid', v_total_paid,
        'order_total', v_order.total_amount,
        'remaining', GREATEST(0, v_order.total_amount - v_total_paid),
        'fully_paid', v_total_paid >= v_order.total_amount,
        'payment_status', CASE 
            WHEN v_total_paid >= v_order.total_amount THEN 'paid'
            ELSE 'partial'
        END
    ) INTO v_result;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error as JSON
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_pos_payment TO authenticated;

-- Add comment
COMMENT ON FUNCTION process_pos_payment IS 'Processes POS payment with validation and automatic status updates';
