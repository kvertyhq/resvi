-- Update RPC to accept restaurant_id
CREATE OR REPLACE FUNCTION create_stripe_payment_intent(
    p_amount numeric, 
    p_currency text DEFAULT 'gbp',
    p_restaurant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_restaurant_id uuid;
    v_payment_settings jsonb;
    v_secret_key text;
    v_response_status integer;
    v_response_content text;
    v_amount_cents integer;
    v_result jsonb;
BEGIN
    -- 1. Validate Restaurant ID
    IF p_restaurant_id IS NULL THEN
        RAISE EXCEPTION 'Restaurant ID is required';
    END IF;

    -- 2. Get Settings for specific restaurant
    SELECT id, payment_settings INTO v_restaurant_id, v_payment_settings 
    FROM restaurant_settings 
    WHERE restaurant_id = p_restaurant_id
    LIMIT 1;

    IF v_payment_settings IS NULL THEN
        RAISE EXCEPTION 'No payment settings found for restaurant %', p_restaurant_id;
    END IF;

    -- 3. Extract Secret Key
    v_secret_key := v_payment_settings->'stripe_config'->>'secret_key';

    IF v_secret_key IS NULL OR v_secret_key = '' THEN
        RAISE EXCEPTION 'Stripe Secret Key not configured in settings.';
    END IF;

    -- 4. Calculate Amount in Cents (Stripe expects integer cents)
    v_amount_cents := (p_amount * 100)::integer;

    -- 5. Call Stripe API
    SELECT status, content::text INTO v_response_status, v_response_content
    FROM extensions.http((
        'POST',
        'https://api.stripe.com/v1/payment_intents',
        ARRAY[
            extensions.http_header('Authorization', 'Bearer ' || v_secret_key),
            extensions.http_header('Content-Type', 'application/x-www-form-urlencoded')
        ],
        'application/x-www-form-urlencoded',
        'amount=' || v_amount_cents || '&currency=' || p_currency || '&automatic_payment_methods[enabled]=true'
    )::extensions.http_request);

    -- 6. Handle Result
    IF v_response_status = 200 THEN
        v_result := v_response_content::jsonb;
        RETURN jsonb_build_object(
            'clientSecret', v_result->>'client_secret',
            'id', v_result->>'id'
        );
    ELSE
        RAISE EXCEPTION 'Stripe API Error: %', v_response_content;
    END IF;
END;
$$;
