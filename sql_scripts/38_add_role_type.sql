-- Add role_type column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_type TEXT DEFAULT 'customer';

-- Update existing profiles based on role
UPDATE profiles 
SET role_type = 'staff' 
WHERE role IN ('admin', 'staff', 'kitchen', 'driver', 'manager', 'super_admin');

UPDATE profiles 
SET role_type = 'customer' 
WHERE role = 'customer' OR role IS NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_type ON profiles(role_type);
