CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'terminal', 'online')),
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (staff) to view and create payments
CREATE POLICY "Staff can view payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
