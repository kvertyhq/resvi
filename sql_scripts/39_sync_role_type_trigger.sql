-- Function to sync role_type based on role
CREATE OR REPLACE FUNCTION public.sync_profile_role_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IN ('admin', 'staff', 'kitchen', 'driver', 'manager', 'super_admin') THEN
        NEW.role := NEW.role;
    ELSE
        NEW.role := 'customer';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run before insert or update
DROP TRIGGER IF EXISTS on_profile_role_change ON profiles;

CREATE TRIGGER on_profile_role_change
BEFORE INSERT OR UPDATE OF role ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_role_type();
