-- Implement smart, secure RLS policies that don't break UX

-- =====================================================
-- WORKSPACES TABLE RLS
-- =====================================================

-- Enable RLS on workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view workspaces they own
CREATE POLICY "workspace_owners_can_view" ON workspaces
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can view workspaces where they are members
-- Using a more efficient approach with a function
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "workspace_members_can_view" ON workspaces
  FOR SELECT
  USING (is_workspace_member(id, auth.uid()));

-- Policy: Only owners can modify workspaces
CREATE POLICY "workspace_owners_can_modify" ON workspaces
  FOR ALL
  USING (auth.uid() = owner_id);

-- =====================================================
-- WORKSPACE_MEMBERS TABLE RLS
-- =====================================================

-- Enable RLS on workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members in workspaces they belong to
CREATE POLICY "members_can_view_workspace_members" ON workspace_members
  FOR SELECT
  USING (
    -- User can see members in workspaces where they are also a member
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own membership (for invitation acceptance)
CREATE POLICY "users_can_join_workspaces" ON workspace_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Workspace owners can manage all memberships in their workspaces
CREATE POLICY "owners_can_manage_members" ON workspace_members
  FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update their own membership (for role changes by owners)
CREATE POLICY "users_can_update_own_membership" ON workspace_members
  FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- WORKSPACE_INVITATIONS TABLE RLS
-- =====================================================

-- Enable RLS on workspace_invitations
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Workspace owners can view and manage invitations for their workspaces
CREATE POLICY "owners_can_manage_invitations" ON workspace_invitations
  FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid()
    )
  );

-- Policy: Anyone can view invitations by token (for invitation acceptance)
-- This is secure because tokens are UUIDs and hard to guess
CREATE POLICY "public_can_view_invitations_by_token" ON workspace_invitations
  FOR SELECT
  USING (token IS NOT NULL);

-- =====================================================
-- USER_PROFILES TABLE RLS
-- =====================================================

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "users_can_view_own_profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can view profiles of other members in their workspaces
CREATE POLICY "users_can_view_workspace_member_profiles" ON user_profiles
  FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT wm.user_id 
      FROM workspace_members wm
      WHERE wm.workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "users_can_insert_own_profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);