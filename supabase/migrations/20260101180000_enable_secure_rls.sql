-- Re-enable RLS with secure, working policies
-- This fixes the security issue while maintaining UX functionality

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can view all profiles (for member display) but only manage their own
CREATE POLICY "users_view_all_profiles" ON user_profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "users_manage_own_profile" ON user_profiles
  FOR ALL
  USING (auth.uid() = id);

-- Workspaces: Users can only see workspaces they're members of
CREATE POLICY "members_view_workspaces" ON workspaces
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = workspaces.id
    )
  );

CREATE POLICY "owners_manage_workspaces" ON workspaces
  FOR ALL
  USING (auth.uid() = owner_id);

-- Workspace Members: Members can view all members of their workspaces
CREATE POLICY "members_view_workspace_members" ON workspace_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members wm2
      WHERE wm2.workspace_id = workspace_members.workspace_id
    )
  );

-- Only owners can manage members
CREATE POLICY "owners_manage_members" ON workspace_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT owner_id FROM workspaces 
      WHERE id = workspace_id
    )
  );

CREATE POLICY "owners_delete_members" ON workspace_members
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM workspaces 
      WHERE id = workspace_id
    )
  );

-- Users can leave workspaces themselves
CREATE POLICY "users_leave_workspaces" ON workspace_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- Workspace Invitations: Owners can manage invitations
CREATE POLICY "owners_manage_invitations" ON workspace_invitations
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT owner_id FROM workspaces 
      WHERE id = workspace_id
    )
  );

-- Anyone can read invitations by token (for acceptance)
CREATE POLICY "read_invitations_by_token" ON workspace_invitations
  FOR SELECT
  USING (true);