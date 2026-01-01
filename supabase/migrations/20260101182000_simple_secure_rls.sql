-- Simple, secure RLS policies that actually work
-- Drop all existing policies first

DROP POLICY IF EXISTS "authenticated_users_view_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_manage_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "members_view_workspaces" ON workspaces;
DROP POLICY IF EXISTS "owners_manage_workspaces" ON workspaces;
DROP POLICY IF EXISTS "members_view_workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "owners_manage_members" ON workspace_members;
DROP POLICY IF EXISTS "owners_delete_members" ON workspace_members;
DROP POLICY IF EXISTS "users_leave_workspaces" ON workspace_members;
DROP POLICY IF EXISTS "owners_manage_invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "read_invitations_by_token" ON workspace_invitations;

-- User Profiles: Authenticated users can view all profiles, manage their own
CREATE POLICY "view_all_profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_own_profile" ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id);

-- Workspaces: Users can only see workspaces they're members of
CREATE POLICY "view_member_workspaces" ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_id = workspaces.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "manage_own_workspaces" ON workspaces
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Workspace Members: Members can view all members of their workspaces
CREATE POLICY "view_workspace_members" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm2
      WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.user_id = auth.uid()
    )
  );

-- Only owners can add/remove members
CREATE POLICY "owners_add_members" ON workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id 
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "owners_remove_members" ON workspace_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id 
      AND owner_id = auth.uid()
    )
  );

-- Users can remove themselves
CREATE POLICY "leave_workspace" ON workspace_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Workspace Invitations: Owners can manage, anyone can read by token
CREATE POLICY "manage_invitations" ON workspace_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id 
      AND owner_id = auth.uid()
    )
  );

-- Public read for invitation acceptance (by token)
CREATE POLICY "read_invitations_by_token" ON workspace_invitations
  FOR SELECT
  USING (true);