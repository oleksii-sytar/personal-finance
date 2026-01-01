-- Fix ambiguous column reference in create_user_profile function

CREATE OR REPLACE FUNCTION create_user_profile(user_id UUID, user_email TEXT, full_name TEXT DEFAULT 'User')
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name)
    VALUES (user_id, COALESCE(full_name, 'User'))
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(create_user_profile.full_name, user_profiles.full_name),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;