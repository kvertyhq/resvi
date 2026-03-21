-- Fix Infinite Recursion by using a SECURITY DEFINER function
-- This function runs with the privileges of the creator (postgres), bypassing RLS on 'profiles' table checks.

CREATE OR REPLACE FUNCTION check_admin_view_access(target_restaurant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  _role text;
  _rid UUID;
BEGIN
  -- Fetch current user's role and restaurant_id
  -- Because this is SECURITY DEFINER, it does NOT trigger RLS on 'profiles'
  SELECT role::text, restaurant_id INTO _role, _rid 
  FROM profiles 
  WHERE id = auth.uid();
  
  -- Allow if Super Admin
  IF _role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  IF _role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Allow if Admin/Restaurant Admin AND Restaurant IDs match
  -- We handle potential NULLs safely
  IF (_role = 'admin' OR _role = 'restaurant_admin') AND _rid IS NOT NULL AND target_restaurant_id IS NOT NULL AND _rid = target_restaurant_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Re-create the policy using the safe function
DROP POLICY IF EXISTS "Admins can view their restaurant users" ON profiles;

CREATE POLICY "Admins can view their restaurant users"
ON profiles FOR SELECT
USING (
  check_admin_view_access(restaurant_id)
);
