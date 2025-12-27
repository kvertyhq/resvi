-- 1. Function to check credits before queuing notification
CREATE OR REPLACE FUNCTION public.check_sms_credits_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance int;
BEGIN
    -- Get current balance for the restaurant
    SELECT balance INTO v_balance
    FROM restaurant_credits
    WHERE restaurant_id = NEW.restaurant_id;

    -- If no record, assume 0 balance (or create one?)
    -- Ideally every restaurant has a record. If not, treat as 0.
    IF v_balance IS NULL THEN
        -- Optional: Auto-create record?
        -- INSERT INTO restaurant_credits (restaurant_id, balance) VALUES (NEW.restaurant_id, 0);
        v_balance := 0;
    END IF;

    -- Check if balance is positive
    -- We assume 1 credit per SMS roughly, but cost varies.
    -- If balance is <= 0, we skip the notification.
    IF v_balance <= 0 THEN
        -- Return NULL to cancel the INSERT operation silently
        -- This effectively prevents the notification from being queued and sent.
        -- We might want to log this 'skip' somewhere else?
        RETURN NULL; 
    END IF;

    -- If balance > 0, proceed.
    -- We do NOT deduct here. Deduction happens upon actual sending (via log_sms_usage).
    RETURN NEW;
END;
$$;

-- 2. Trigger on notifications table
DROP TRIGGER IF EXISTS trg_check_sms_credits ON notifications;

CREATE TRIGGER trg_check_sms_credits
BEFORE INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION public.check_sms_credits_before_insert();


-- 3. RPC to log SMS usage and deduct credits (Called by n8n)
CREATE OR REPLACE FUNCTION public.log_sms_usage(
    p_restaurant_id uuid,
    p_notification_id uuid, -- Optional, to link back
    p_recipient text,
    p_provider_message_id text,
    p_status text, -- 'sent', 'delivered', 'failed'
    p_cost int DEFAULT 1, -- Cost in credits
    p_parts int DEFAULT 1 -- Number of SMS parts
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance int;
BEGIN
    -- Only deduct if status implies successful *send* attempt (e.g. 'sent', 'queued' by provider)
    -- If 'failed' locally before sending, maybe don't deduct?
    -- Usually provider charges for 'sent'.
    
    -- Deduct credits
    UPDATE restaurant_credits
    SET balance = balance - p_cost,
        updated_at = now()
    WHERE restaurant_id = p_restaurant_id
    RETURNING balance INTO v_new_balance;

    -- Log to sms_logs
    INSERT INTO sms_logs (
        restaurant_id,
        notification_id,
        recipient,
        provider_message_id,
        status,
        cost_credits,
        parts,
        created_at
    ) VALUES (
        p_restaurant_id,
        p_notification_id,
        p_recipient,
        p_provider_message_id,
        p_status,
        p_cost,
        p_parts,
        now()
    );

    -- Log transaction
    INSERT INTO credit_transactions (
        restaurant_id,
        amount, -- Monetary amount (0 for usage)
        credits_added, -- Negative for usage
        transaction_type,
        description,
        created_at
    ) VALUES (
        p_restaurant_id,
        0,
        -p_cost,
        'usage',
        'SMS sent to ' || p_recipient,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
