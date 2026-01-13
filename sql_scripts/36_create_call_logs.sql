CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_number TEXT NOT NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')) DEFAULT 'inbound',
    status TEXT CHECK (status IN ('missed', 'answered', 'voicemail', 'rejected')) DEFAULT 'missed',
    duration INTEGER DEFAULT 0, -- in seconds
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    restaurant_id UUID REFERENCES restaurant_settings(id)
);

-- Index for quick lookup by number
CREATE INDEX IF NOT EXISTS idx_call_logs_number ON call_logs(caller_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON call_logs(created_at DESC);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to call logs" ON call_logs FOR ALL TO authenticated USING (true);
