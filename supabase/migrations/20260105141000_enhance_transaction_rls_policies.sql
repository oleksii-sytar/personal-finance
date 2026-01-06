-- Enhance transaction RLS policies for workspace access control
-- Implements Requirements 10.1, 10.2, 10.3, 10.4

-- Drop existing transaction policies to recreate with enhanced security
DROP POLICY IF EXISTS "Users can view transactions in their workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions in their workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions in their workspaces" ON transactions;

-- Enhanced RLS policies for transactions with workspace membership verification
-- These policies ensure users can only access transactions in workspaces they are members of

-- SELECT policy: Users can view transactions in workspaces where they are members
CREATE POLICY "Users can view transactions in member workspaces" ON transactions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT policy: Users can create transactions in workspaces where they are members
-- Also ensures user_id and created_by are set to the authenticated user
CREATE POLICY "Users can create transactions in member workspaces" ON transactions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    ) AND
    user_id = auth.uid() AND
    created_by = auth.uid()
  );

-- UPDATE policy: Users can update transactions in workspaces where they are members
-- Also ensures updated_by is set to the authenticated user
CREATE POLICY "Users can update transactions in member workspaces" ON transactions
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    ) AND
    updated_by = auth.uid()
  );

-- DELETE policy: Users can delete transactions in workspaces where they are members
CREATE POLICY "Users can delete transactions in member workspaces" ON transactions
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Update recurring_transactions policies to use consistent naming
DROP POLICY IF EXISTS "Users can view recurring transactions in own workspaces" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can create recurring transactions in own workspaces" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can update recurring transactions in own workspaces" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can delete recurring transactions in own workspaces" ON recurring_transactions;

CREATE POLICY "Users can view recurring transactions in member workspaces" ON recurring_transactions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recurring transactions in member workspaces" ON recurring_transactions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    ) AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can update recurring transactions in member workspaces" ON recurring_transactions
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recurring transactions in member workspaces" ON recurring_transactions
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Update expected_transactions policies to use consistent naming
DROP POLICY IF EXISTS "Users can view expected transactions in own workspaces" ON expected_transactions;
DROP POLICY IF EXISTS "Users can create expected transactions in own workspaces" ON expected_transactions;
DROP POLICY IF EXISTS "Users can update expected transactions in own workspaces" ON expected_transactions;
DROP POLICY IF EXISTS "Users can delete expected transactions in own workspaces" ON expected_transactions;

CREATE POLICY "Users can view expected transactions in member workspaces" ON expected_transactions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expected transactions in member workspaces" ON expected_transactions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expected transactions in member workspaces" ON expected_transactions
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expected transactions in member workspaces" ON expected_transactions
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to verify workspace access (for use in application code)
CREATE OR REPLACE FUNCTION verify_workspace_access(
  p_user_id UUID,
  p_workspace_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE user_id = p_user_id 
    AND workspace_id = p_workspace_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's workspace memberships (for use in application code)
CREATE OR REPLACE FUNCTION get_user_workspace_memberships(
  p_user_id UUID
) RETURNS TABLE (
  workspace_id UUID,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT wm.workspace_id, wm.role
  FROM workspace_members wm
  WHERE wm.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document the access control system
COMMENT ON POLICY "Users can view transactions in member workspaces" ON transactions IS 
'Requirement 10.2: Users can only view transactions from workspaces where they are members';

COMMENT ON POLICY "Users can create transactions in member workspaces" ON transactions IS 
'Requirement 10.1: Users can only create transactions in workspaces where they are members';

COMMENT ON POLICY "Users can update transactions in member workspaces" ON transactions IS 
'Requirement 10.3: Users can only edit transactions in workspaces where they are members';

COMMENT ON POLICY "Users can delete transactions in member workspaces" ON transactions IS 
'Requirement 10.4: Users can only delete transactions in workspaces where they are members';

COMMENT ON FUNCTION verify_workspace_access(UUID, UUID) IS 
'Helper function to verify if a user has access to a specific workspace';

COMMENT ON FUNCTION get_user_workspace_memberships(UUID) IS 
'Helper function to get all workspace memberships for a user';