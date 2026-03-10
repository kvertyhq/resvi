-- Migration: Add fusion_uuid to call_logs
-- Description: Adds a column to store the unique call identifier from FusionPBX

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS direction TEXT CHECK (direction IN ('inbound', 'outbound')) DEFAULT 'inbound';
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS fusion_uuid TEXT;

-- Update the status check constraint to include 'called'
-- First we drop the constraint if it exists (inline constraints are usually named table_column_check)
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_status_check;
ALTER TABLE call_logs ADD CONSTRAINT call_logs_status_check CHECK (status IN ('missed', 'answered', 'voicemail', 'rejected', 'called'));

-- Index for quick lookup and deduplication if needed later
CREATE INDEX IF NOT EXISTS idx_call_logs_fusion_uuid ON call_logs(fusion_uuid);


ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;

