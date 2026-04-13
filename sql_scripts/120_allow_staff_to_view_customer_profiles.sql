-- 120_allow_staff_to_view_customer_profiles.sql
-- This script updates the RLS policy on the profiles table to ensure POS staff can see customer profiles.
-- It fixes an infinite recursion error by using a SECURITY DEFINER function.

-- 1. Safely add missing values to the role_type enum if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        BEGIN
            ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'pos';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'service_staff';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 2. Create a SECURITY DEFINER function to handle role checks safely
-- This function bypasses RLS on 'profiles', preventing infinite recursion loops.
CREATE OR REPLACE FUNCTION public.has_staff_access(target_restaurant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  _role text;
  _rid UUID;
BEGIN
  -- We query the profiles table directly. 
  -- SECURITY DEFINER ensures this doesn't trigger the RLS policy we are currently defining.
  SELECT role::text, restaurant_id INTO _role, _rid 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- 1. Super Admin access
  IF _role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- 2. Staff access within the same restaurant
  -- Includes admin, pos, staff, service_staff, manager, kitchen, and driver roles.
  IF _role IN ('admin', 'pos', 'staff', 'service_staff', 'manager', 'kitchen', 'driver') 
     AND (_rid = target_restaurant_id OR target_restaurant_id IS NULL) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view own profile_v2" ON public.profiles;
DROP POLICY IF EXISTS "Allow staff to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow members and staff to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view their restaurant users" ON public.profiles;

-- 4. Create the final inclusive policy
-- This allows users to see their own profile OR staff to see profiles in their restaurant.
CREATE POLICY "Allow members and staff to view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id -- User can see their own profile
  OR 
  public.has_staff_access(restaurant_id) -- Staff with proper permissions
);

-- 5. Finalize permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_access(UUID) TO authenticated;
