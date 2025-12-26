-- Allow Admins and Restaurant Admins to view profiles of users in their same restaurant
-- This is necessary for the Customer Management page to load data.

DROP POLICY IF EXISTS "Admins can view their restaurant users" ON profiles;

CREATE POLICY "Admins can view their restaurant users"
ON profiles FOR SELECT
USING (
  -- The requesting user must have a restaurant_id that matches the target profile's restaurant_id
  restaurant_id = (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND (role::text = 'admin' OR role::text = 'restaurant_admin')
  )
);
