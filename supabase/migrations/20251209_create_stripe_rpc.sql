-- Enable HTTP extension
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;

-- RPC to create payment intent
CREATE OR REPLACE FUNCTION create_stripe_payment_intent(p_amount numeric, p_currency text DEFAULT 'gbp')
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
    -- 1. Get Restaurant ID (assuming single restaurant or from context, here we pick the first or specific)
    -- Ideally pass restaurant_id param, but for safety we can look up settings.
    -- For this app, we assume we want settings for the restaurant linked to the current domain/env. 
    -- Since we can't easily guess, we'll select the FIRST restaurant_settings found (since usually 1 per project)
    SELECT id, payment_settings INTO v_restaurant_id, v_payment_settings 
    FROM restaurant_settings 
    LIMIT 1;

    -- 2. Extract Secret Key
    v_secret_key := v_payment_settings->'stripe_config'->>'secret_key';

    IF v_secret_key IS NULL OR v_secret_key = '' THEN
        RAISE EXCEPTION 'Stripe Secret Key not configured in settings.';
    END IF;

    -- 3. Calculate Amount in Cents (Stripe expects integer cents)
    v_amount_cents := (p_amount * 100)::integer;

    -- 4. Call Stripe API
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

    -- 5. Handle Result
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
