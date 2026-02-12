-- Create a helper function to check workspace membership
-- This avoids ambiguous column references in RLS policies
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- CATEGORIES TABLE - Use function-based RLS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can create categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can update categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can delete categories in their workspaces" ON categories;

CREATE POLICY "Users can view categories in their workspaces" ON categories
    FOR SELECT USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can create categories in their workspaces" ON categories
    FOR INSERT WITH CHECK (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can update categories in their workspaces" ON categories
    FOR UPDATE USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can delete categories in their workspaces" ON categories
    FOR DELETE USING (user_has_workspace_access(workspace_id));

-- ============================================================================
-- ACCOUNTS TABLE - Use function-based RLS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can update accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can delete accounts in their workspaces" ON accounts;

CREATE POLICY "Users can view accounts in their workspaces" ON accounts
    FOR SELECT USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can create accounts in their workspaces" ON accounts
    FOR INSERT WITH CHECK (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can update accounts in their workspaces" ON accounts
    FOR UPDATE USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can delete accounts in their workspaces" ON accounts
    FOR DELETE USING (user_has_workspace_access(workspace_id));

-- ============================================================================
-- TRANSACTION_TYPES TABLE - Use function-based RLS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view transaction types in their workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can create transaction types in their workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can update transaction types in their workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can delete transaction types in their workspaces" ON transaction_types;

CREATE POLICY "Users can view transaction types in their workspaces" ON transaction_types
    FOR SELECT USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can create transaction types in their workspaces" ON transaction_types
    FOR INSERT WITH CHECK (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can update transaction types in their workspaces" ON transaction_types
    FOR UPDATE USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can delete transaction types in their workspaces" ON transaction_types
    FOR DELETE USING (user_has_workspace_access(workspace_id));

-- ============================================================================
-- WORKSPACES TABLE - Use function-based RLS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;

CREATE POLICY "Users can view their workspaces" ON workspaces
    FOR SELECT USING (user_has_workspace_access(id));

-- ============================================================================
-- RECONCILIATION_SESSIONS TABLE - Use function-based RLS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view reconciliation sessions in their workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can create reconciliation sessions in their workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can update reconciliation sessions in their workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can delete reconciliation sessions in their workspaces" ON reconciliation_sessions;

CREATE POLICY "Users can view reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR SELECT USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can create reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR INSERT WITH CHECK (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can update reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR UPDATE USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Users can delete reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR DELETE USING (user_has_workspace_access(workspace_id));

-- ============================================================================
-- BALANCE_UPDATE_HISTORY TABLE - Use function-based RLS
-- ============================================================================
-- Create helper function for account-based access
CREATE OR REPLACE FUNCTION public.user_has_account_access(account_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM accounts a
    JOIN workspace_members wm ON wm.workspace_id = a.workspace_id
    WHERE a.id = account_uuid 
    AND wm.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Users can view balance updates in their workspaces" ON balance_update_history;
DROP POLICY IF EXISTS "Users can create balance updates in their workspaces" ON balance_update_history;

CREATE POLICY "Users can view balance updates in their workspaces" ON balance_update_history
    FOR SELECT USING (user_has_account_access(account_id));

CREATE POLICY "Users can create balance updates in their workspaces" ON balance_update_history
    FOR INSERT WITH CHECK (user_has_account_access(account_id));
