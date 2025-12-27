-- 1. Add provider_response column to sms_logs
ALTER TABLE "public"."sms_logs"
ADD COLUMN IF NOT EXISTS "provider_response" jsonb DEFAULT NULL;

-- 2. Update log_sms_usage RPC to accept provider_response
CREATE OR REPLACE FUNCTION public.log_sms_usage(
    p_restaurant_id uuid,
    p_notification_id uuid DEFAULT NULL, -- Optional, to link back
    p_recipient text DEFAULT NULL,
    p_provider_message_id text DEFAULT NULL,
    p_status text DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
    p_cost int DEFAULT 1, -- Cost in credits
    p_provider_response jsonb DEFAULT NULL -- NEW: Full response from provider
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
        cost_in_credits,
        provider_response, -- NEW
        created_at
    ) VALUES (
        p_restaurant_id,
        p_notification_id,
        p_recipient,
        p_provider_message_id,
        p_status,
        p_cost,
        p_provider_response, -- NEW
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
        'SMS sent to ' || coalesce(p_recipient, 'unknown'),
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
