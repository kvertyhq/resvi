-- Add payment fields to orders table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cash';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'; -- pending, paid, failed, refunded
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stripe_payment_intent_id') THEN
        ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT;
    END IF;
END $$;
