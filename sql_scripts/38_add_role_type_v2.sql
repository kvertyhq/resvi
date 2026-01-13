-- Add role_type column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- Update existing profiles based on role (cast to text to match literals safely)
UPDATE profiles 
SET role = 'staff' 
WHERE role::text IN ('admin', 'staff', 'kitchen', 'driver', 'manager', 'super_admin');

UPDATE profiles 
SET role = 'customer' 
WHERE role::text = 'customer' OR role IS NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_type ON profiles(role);
