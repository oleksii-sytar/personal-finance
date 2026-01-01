-- Fix RLS policy for workspace_members table to allow members to see all members in their workspaces

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can manage own workspace memberships" ON workspace_members;

-- Create policy that allows users to see all members in workspaces they belong to
CREATE POLICY "Users can view members in their workspaces" ON workspace_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Allow users to insert their own memberships (for invitation acceptance)
CREATE POLICY "Users can insert own memberships" ON workspace_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow owners to manage memberships in their workspaces
CREATE POLICY "Owners can manage workspace memberships" ON workspace_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id 
      AND w.owner_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;