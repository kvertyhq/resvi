-- Create daily_reports table for Z-report snapshots
CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurant_settings(id) ON DELETE CASCADE NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('z')),
    report_date DATE NOT NULL,
    total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    order_count INTEGER NOT NULL DEFAULT 0,
    payment_breakdown JSONB DEFAULT '{}',
    staff_id UUID, -- Optional: which staff member closed the day
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_restaurant_report_date UNIQUE (restaurant_id, report_date, report_type)
);

-- RLS Policies
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage daily reports"
ON daily_reports FOR ALL
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Staff can view daily reports"
ON daily_reports FOR SELECT
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM profiles 
        WHERE id = auth.uid()
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_daily_reports_restaurant_date ON daily_reports(restaurant_id, report_date);
