-- 120_allow_staff_to_view_customer_profiles.sql
-- This script updates the RLS policy on the profiles table to ensure POS staff can see customer names and phone numbers.
-- It is designed to be safe for systems using the "role_type" enum.

-- 1. Safely add missing values to the role_type enum if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        -- We handle each add separately because they might already exist
        BEGIN
            ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'pos';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'service_staff';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 2. Drop the overly restrictive policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile_v2" ON public.profiles;
DROP POLICY IF EXISTS "Allow staff to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow members and staff to view profiles" ON public.profiles;

-- 3. Create a new, inclusive policy
-- This allows:
-- 1. Any user to see their own profile.
-- 2. Staff members (admin, super_admin, pos, staff, service_staff, manager, etc.) to see all profiles.
CREATE POLICY "Allow members and staff to view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id -- User can see their own profile
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles staff
    WHERE staff.id = auth.uid()
    AND staff.role::text IN ('admin', 'super_admin', 'pos', 'staff', 'service_staff', 'manager', 'kitchen', 'driver')
  )
);

-- 4. Ensure authenticated users have select permissions
GRANT SELECT ON public.profiles TO authenticated;
