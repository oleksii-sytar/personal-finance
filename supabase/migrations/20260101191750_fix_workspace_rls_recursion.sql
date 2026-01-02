-- Fix infinite recursion in workspace RLS policies
-- The issue is that workspace policies are referencing workspace_members, causing recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "workspace_owners_full_access" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_read_access" ON workspaces;

-- Create simpler, non-recursive policies for workspaces
-- Policy 1: Workspace owners have full access
CREATE POLICY "workspace_owners_access" ON workspaces
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy 2: Service role (for server actions) has full access
CREATE POLICY "service_role_workspace_access" ON workspaces
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For workspace members access, we'll handle this in the application layer
-- using server actions that use the service role, avoiding RLS recursion

-- Ensure workspace_members policies are correct and non-recursive
DROP POLICY IF EXISTS "users_read_own_memberships" ON workspace_members;
DROP POLICY IF EXISTS "owners_manage_workspace_members" ON workspace_members;

-- Recreate workspace_members policies without recursion
CREATE POLICY "users_read_own_memberships" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Workspace owners can manage members (this is safe because it doesn't reference workspaces in a circular way)
CREATE POLICY "owners_manage_workspace_members" ON workspace_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_members.workspace_id 
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_members.workspace_id 
      AND owner_id = auth.uid()
    )
  );