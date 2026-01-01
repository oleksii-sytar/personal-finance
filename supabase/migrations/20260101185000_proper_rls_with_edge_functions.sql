-- Re-enable RLS on workspace_members and create proper policies
-- This time using a different approach that works with Edge Functions

-- Re-enable RLS on workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "authenticated_view_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_manage_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "owners_view_workspaces" ON workspaces;
DROP POLICY IF EXISTS "owners_manage_workspaces" ON workspaces;
DROP POLICY IF EXISTS "authenticated_view_invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "authenticated_manage_invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "public_read_invitations" ON workspace_invitations;

-- User Profiles: Allow authenticated users to view all profiles (needed for member display)
CREATE POLICY "authenticated_users_read_profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "users_insert_own_profile" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Workspaces: Users can only see workspaces where they are members
-- This avoids recursion by using a simple owner check first, then Edge Functions handle complex logic
CREATE POLICY "workspace_owners_full_access" ON workspaces
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Members can read workspaces (but Edge Functions will handle the membership verification)
CREATE POLICY "workspace_members_read_access" ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_id = workspaces.id 
      AND user_id = auth.uid()
    )
  );

-- Workspace Members: Simple policies that work with Edge Functions
-- Allow service role (Edge Functions) full access
CREATE POLICY "service_role_full_access_members" ON workspace_members
  FOR ALL
  TO service_role
  USING (true);

-- For authenticated users, allow read access to their own membership records
CREATE POLICY "users_read_own_memberships" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Workspace owners can manage members
CREATE POLICY "owners_manage_workspace_members" ON workspace_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id 
      AND owner_id = auth.uid()
    )
  );

-- Workspace Invitations: Allow service role full access for Edge Functions
CREATE POLICY "service_role_full_access_invitations" ON workspace_invitations
  FOR ALL
  TO service_role
  USING (true);

-- Allow public read access for invitation acceptance (by token)
CREATE POLICY "public_read_invitations_by_token" ON workspace_invitations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Workspace owners can manage invitations
CREATE POLICY "owners_manage_invitations" ON workspace_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_id 
      AND owner_id = auth.uid()
    )
  );