-- Migration: Enable Public Read for Stations
-- Description: Allows the 'anon' role to SELECT from the stations table.
-- This is necessary for the KDS and POS to load station configurations via the anon key.

CREATE POLICY "Enable read access for all" ON stations
    FOR SELECT USING (true);

-- Ensure the 'anon' role has internal Postgres permissions if necessary 
-- (Usually managed by Supabase RLS, but explicit grant is safer)
GRANT SELECT ON stations TO anon;
GRANT SELECT ON stations TO authenticated;
