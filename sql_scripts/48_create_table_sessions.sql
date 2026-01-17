-- Migration: Create Table Sessions for Occupancy Tracking
-- Description: Tracks table occupancy duration for analytics and reporting

-- Create table_sessions table
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurant_settings(id) NOT NULL,
    table_id UUID REFERENCES table_info(id) NOT NULL,
    order_id UUID REFERENCES orders(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant ON table_sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_dates ON table_sessions(started_at, ended_at);
CREATE INDEX IF NOT EXISTS idx_table_sessions_order ON table_sessions(order_id);

-- Add RLS policies
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view sessions for their restaurant
CREATE POLICY "Staff can view table sessions for their restaurant"
ON table_sessions FOR SELECT
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
);

-- Policy: Staff can insert sessions for their restaurant
CREATE POLICY "Staff can insert table sessions for their restaurant"
ON table_sessions FOR INSERT
WITH CHECK (
    restaurant_id IN (
        SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
);

-- Policy: Staff can update sessions for their restaurant
CREATE POLICY "Staff can update table sessions for their restaurant"
ON table_sessions FOR UPDATE
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
);

-- RPC: Start table session
CREATE OR REPLACE FUNCTION start_table_session(
    p_restaurant_id UUID,
    p_table_id UUID,
    p_order_id UUID
) RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Check if there's already an active session for this table
    SELECT id INTO v_session_id
    FROM table_sessions
    WHERE table_id = p_table_id
    AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;
    
    -- If active session exists, return it
    IF v_session_id IS NOT NULL THEN
        RETURN v_session_id;
    END IF;
    
    -- Create new session
    INSERT INTO table_sessions (
        restaurant_id,
        table_id,
        order_id,
        started_at
    ) VALUES (
        p_restaurant_id,
        p_table_id,
        p_order_id,
        NOW()
    ) RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: End table session
CREATE OR REPLACE FUNCTION end_table_session(
    p_table_id UUID,
    p_order_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_session_id UUID;
    v_duration INTEGER;
BEGIN
    -- Find active session for this table/order
    SELECT id INTO v_session_id
    FROM table_sessions
    WHERE table_id = p_table_id
    AND (order_id = p_order_id OR order_id IS NULL)
    AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate duration in minutes
    SELECT EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 INTO v_duration
    FROM table_sessions
    WHERE id = v_session_id;
    
    -- Update session
    UPDATE table_sessions
    SET ended_at = NOW(),
        duration_minutes = ROUND(v_duration)
    WHERE id = v_session_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE table_sessions IS 'Tracks table occupancy sessions for analytics';
COMMENT ON FUNCTION start_table_session IS 'Starts a new table session when order is created';
COMMENT ON FUNCTION end_table_session IS 'Ends table session when order is completed';
