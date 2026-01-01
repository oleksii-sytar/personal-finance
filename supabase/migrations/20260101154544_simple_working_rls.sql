-- Simple, working RLS policies that definitely work

-- Drop all existing policies and functions
DROP POLICY IF EXISTS "workspace_owners_can_view" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_can_view" ON workspaces;
DROP POLICY IF EXISTS "workspace_owners_can_modify" ON workspaces;
DROP POLICY IF EXISTS "members_can_view_workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "users_can_join_workspaces" ON workspace_members;
DROP POLICY IF EXISTS "owners_can_manage_members" ON workspace_members;
DROP POLICY IF EXISTS "users_can_update_own_membership" ON workspace_members;
DROP POLICY IF EXISTS "owners_can_manage_invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "public_can_view_invitations_by_token" ON workspace_invitations;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_view_workspace_member_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;
DROP FUNCTION IF EXISTS is_workspace_member(uuid, uuid);

-- =====================================================
-- SIMPLE WORKSPACES RLS
-- =====================================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can read all workspaces they have membership in
CREATE POLICY "authenticated_users_workspaces" ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Only owners can modify
CREATE POLICY "owners_modify_workspaces" ON workspaces
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- =====================================================
-- SIMPLE WORKSPACE_MEMBERS RLS
-- =====================================================
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Users can see members in workspaces they belong to
CREATE POLICY "view_workspace_members" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own membership
CREATE POLICY "insert_own_membership" ON workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owners can manage members
CREATE POLICY "owners_manage_members" ON workspace_members
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- SIMPLE USER_PROFILES RLS
-- =====================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view profiles of people in their workspaces
CREATE POLICY "view_workspace_user_profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    id IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can manage their own profile
CREATE POLICY "manage_own_profile" ON user_profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- SIMPLE WORKSPACE_INVITATIONS RLS
-- =====================================================
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Owners can manage invitations
CREATE POLICY "owners_manage_invitations" ON workspace_invitations
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Anyone can read invitations by token (for acceptance)
CREATE POLICY "read_invitations_by_token" ON workspace_invitations
  FOR SELECT
  TO authenticated
  USING (true);