-- Migration: Fix call_logs to profiles relationship
-- Description: Adds customer_id column and foreign key to link call logs with customer profiles

-- 1. Add the customer_id column if it doesn't exist
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Update existing call_logs by matching caller_number with profiles.phone
-- This helps linking historical calls to existing customers
UPDATE call_logs cl
SET customer_id = p.id
FROM profiles p
WHERE cl.caller_number = p.phone
AND cl.customer_id IS NULL;

-- 3. Add an index for the foreign key for better join performance
CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id ON call_logs(customer_id);
