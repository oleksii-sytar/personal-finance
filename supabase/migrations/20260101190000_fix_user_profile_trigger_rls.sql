-- Fix RLS policies to allow the user profile trigger to work
-- The trigger runs as SECURITY DEFINER and needs to insert profiles for new users

-- Add policy to allow service role (triggers) to insert user profiles
CREATE POLICY "service_role_insert_profiles" ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow service role to update profiles (for trigger updates)
CREATE POLICY "service_role_update_profiles" ON user_profiles
  FOR UPDATE
  TO service_role
  USING (true);