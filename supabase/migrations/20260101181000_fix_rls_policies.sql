-- Fix RLS policies to handle unauthenticated queries properly
-- This ensures security while allowing proper testing

-- Drop existing policies first
DROP POLICY IF EXISTS "users_view_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_manage_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "members_view_workspaces" ON workspaces;
DROP POLICY IF EXISTS "owners_manage_workspaces" ON workspaces;
DROP POLICY IF EXISTS "members_view_workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "owners_manage_members" ON workspace_members;
DROP POLICY IF EXISTS "owners_delete_members" ON workspace_members;
DROP POLICY IF EXISTS "users_leave_workspaces" ON workspace_members;
DROP POLICY IF EXISTS "owners_manage_invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "read_invitations_by_token" ON workspace_invitations;

-- User Profiles: Users can view all profiles (for member display) but only manage their own
CREATE POLICY "authenticated_users_view_profiles" ON user_profiles
  FOR SELECT
  USING (
    CASE 
      WHEN auth.role() = 'authenticated' THEN true
      ELSE false
    END
  );

CREATE POLICY "users_manage_own_profile" ON user_profiles
  FOR ALL
  USING (auth.uid() = id);

-- Workspaces: Users can only see workspaces they're members of
CREATE POLICY "members_view_workspaces" ON workspaces
  FOR SELECT
  USING (
    CASE 
      WHEN auth.role() = 'authenticated' THEN
        auth.uid() IN (
          SELECT user_id FROM workspace_members 
          WHERE workspace_id = workspaces.id
        )
      ELSE false
    END
  );

CREATE POLICY "owners_manage_workspaces" ON workspaces
  FOR ALL
  USING (
    CASE 
      WHEN auth.role() = 'authenticated' THEN auth.uid() = owner_id
      ELSE false
    END
  );

-- Workspace Members: Members can view all members of their workspaces
CREATE POLICY "members_view_workspace_members" ON workspace_members
  FOR SELECT
  USING (
    CASE 
      WHEN auth.role() = 'authenticated' THEN
        auth.uid() IN (
          SELECT user_id FROM workspace_members wm2
          WHERE wm2.workspace_id = workspace_members.workspace_id
        )
      ELSE false
    END
  );

-- Only owners can manage members
CREATE POLICY "owners_manage_members" ON workspace_members
  FOR INSERT
  WITH CHECK (
    CASE 
      WHEN auth.role() = 'authenticated' THEN
        auth.uid() IN (
          SELECT owner_id FROM workspaces 
          WHERE id = workspace_id
        )
      ELSE false
    END
  );

CREATE POLICY "owners_delete_members" ON workspace_members
  FOR DELETE
  USING (
    CASE 
      WHEN auth.role() = 'authenticated' THEN
        auth.uid() IN (
          SELECT owner_id FROM workspaces 
          WHERE id = workspace_id
        )
      ELSE false
    END
  );

-- Users can leave workspaces themselves
CREATE POLICY "users_leave_workspaces" ON workspace_members
  FOR DELETE
  USING (
    CASE 
      WHEN auth.role() = 'authenticated' THEN auth.uid() = user_id
      ELSE false
    END
  );

-- Workspace Invitations: Owners can manage invitations
CREATE POLICY "owners_manage_invitations" ON workspace_invitations
  FOR ALL
  USING (
    CASE 
      WHEN auth.role() = 'authenticated' THEN
        auth.uid() IN (
          SELECT owner_id FROM workspaces 
          WHERE id = workspace_id
        )
      ELSE false
    END
  );

-- Anyone can read invitations by token (for acceptance) - this is needed for the invitation flow
CREATE POLICY "read_invitations_by_token" ON workspace_invitations
  FOR SELECT
  USING (true);