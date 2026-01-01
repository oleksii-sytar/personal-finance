-- Fix RLS policy for workspaces table to allow members to read workspace data

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;

-- Create new policy that allows both owners and members to read workspace data
CREATE POLICY "Users can view workspaces they own or are members of" ON workspaces
  FOR SELECT
  USING (
    auth.uid() = owner_id OR 
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_members.workspace_id = workspaces.id 
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;