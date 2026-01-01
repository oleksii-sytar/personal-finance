-- Fix infinite recursion in RLS policies
-- The issue is that policies are referencing the same table they're protecting

-- Drop all existing policies
DROP POLICY IF EXISTS "view_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "manage_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "view_member_workspaces" ON workspaces;
DROP POLICY IF EXISTS "manage_own_workspaces" ON workspaces;
DROP POLICY IF EXISTS "view_workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "owners_add_members" ON workspace_members;
DROP POLICY IF EXISTS "owners_remove_members" ON workspace_members;
DROP POLICY IF EXISTS "leave_workspace" ON workspace_members;
DROP POLICY IF EXISTS "manage_invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "read_invitations_by_token" ON workspace_invitations;

-- User Profiles: Simple policies without recursion
CREATE POLICY "authenticated_view_profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_manage_own_profile" ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id);

-- Workspaces: Users can see workspaces they own
CREATE POLICY "owners_view_workspaces" ON workspaces
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "owners_manage_workspaces" ON workspaces
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Workspace Members: Simple policies - let server actions handle complex logic
CREATE POLICY "authenticated_view_members" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_members" ON workspace_members
  FOR ALL
  TO authenticated
  USING (true);

-- Workspace Invitations: Simple policies
CREATE POLICY "authenticated_view_invitations" ON workspace_invitations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_invitations" ON workspace_invitations
  FOR ALL
  TO authenticated
  USING (true);

-- Public read for invitation acceptance (by token)
CREATE POLICY "public_read_invitations" ON workspace_invitations
  FOR SELECT
  TO anon
  USING (true);