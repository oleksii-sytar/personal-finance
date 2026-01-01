-- Final fix for Supabase Auth user_profiles trigger
-- This addresses the specific issue where Supabase Auth can't create user profiles

-- First, let's make sure we have the right permissions and setup
-- Drop existing triggers to start clean
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Recreate the function with explicit error handling and logging
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into user_profiles with proper error handling
    INSERT INTO public.user_profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', user_profiles.full_name),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres;

-- Create the trigger with proper timing
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also handle updates to sync profile changes
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW 
    WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
    EXECUTE FUNCTION handle_new_user();

-- Alternative approach: Create a webhook-style function that can be called manually
-- This is a backup in case the trigger approach doesn't work
CREATE OR REPLACE FUNCTION create_user_profile(user_id UUID, user_email TEXT, full_name TEXT DEFAULT 'User')
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name)
    VALUES (user_id, COALESCE(full_name, 'User'))
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(full_name, user_profiles.full_name),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the manual function
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO authenticated;