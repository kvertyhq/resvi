CREATE TABLE IF NOT EXISTS staff_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurant_settings(id),
    clock_in TIMESTAMPTZ DEFAULT NOW(),
    clock_out TIMESTAMPTZ,
    total_hours DECIMAL(10,2), -- Calculated on clock out
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of active shifts
CREATE INDEX IF NOT EXISTS idx_shifts_staff_active ON staff_shifts(staff_id) WHERE clock_out IS NULL;

ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view/update own shifts" ON staff_shifts FOR ALL TO authenticated USING (true);
