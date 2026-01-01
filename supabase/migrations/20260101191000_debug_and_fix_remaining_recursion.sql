-- Debug and fix the remaining recursion issue for invited users
-- The issue seems to be in user profile creation for invited users

-- First, let's see what policies exist and drop any that might cause recursion
-- Drop all existing policies on workspace_members to eliminate recursion
DROP POLICY IF EXISTS "service_role_full_access_members" ON workspace_members;
DROP POLICY IF EXISTS "users_read_own_memberships" ON workspace_members;
DROP POLICY IF EXISTS "owners_manage_workspace_members" ON workspace_members;

-- Create simple, non-recursive policies for workspace_members
-- Allow service role (Edge Functions) full access
CREATE POLICY "service_role_workspace_members" ON workspace_members
  FOR ALL
  TO service_role
  USING (true);

-- Allow authenticated users to read their own memberships only (no recursion)
CREATE POLICY "read_own_memberships" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow workspace owners to manage members (simple owner check, no recursion)
CREATE POLICY "owners_manage_members" ON workspace_members
  FOR ALL
  TO authenticated
  USING (
    -- Simple check: user must be owner of the workspace
    -- This avoids recursion by not querying workspace_members
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id 
      AND owner_id = auth.uid()
    )
  );

-- Also ensure user_profiles policies are simple and don't cause recursion
-- Drop and recreate user_profiles policies to be absolutely sure
DROP POLICY IF EXISTS "authenticated_users_read_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "service_role_insert_profiles" ON user_profiles;
DROP POLICY IF EXISTS "service_role_update_profiles" ON user_profiles;

-- Simple, non-recursive user_profiles policies
CREATE POLICY "all_authenticated_read_profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_manage_own_profile" ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id);

-- Allow service role (triggers and Edge Functions) full access
CREATE POLICY "service_role_profiles_access" ON user_profiles
  FOR ALL
  TO service_role
  WITH CHECK (true);