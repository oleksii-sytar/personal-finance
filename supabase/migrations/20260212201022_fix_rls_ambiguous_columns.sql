-- Fix ambiguous column references in RLS policies
-- Error 42P17 indicates column name ambiguity in subqueries

-- ============================================================================
-- CATEGORIES TABLE - Fix ambiguous column references
-- ============================================================================
DROP POLICY IF EXISTS "Users can view categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can create categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can update categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can delete categories in their workspaces" ON categories;

CREATE POLICY "Users can view categories in their workspaces" ON categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = categories.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create categories in their workspaces" ON categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = categories.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories in their workspaces" ON categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = categories.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete categories in their workspaces" ON categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = categories.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- ACCOUNTS TABLE - Fix ambiguous column references
-- ============================================================================
DROP POLICY IF EXISTS "Users can view accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can update accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can delete accounts in their workspaces" ON accounts;

CREATE POLICY "Users can view accounts in their workspaces" ON accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = accounts.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create accounts in their workspaces" ON accounts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = accounts.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update accounts in their workspaces" ON accounts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = accounts.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete accounts in their workspaces" ON accounts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = accounts.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- TRANSACTION_TYPES TABLE - Fix ambiguous column references
-- ============================================================================
DROP POLICY IF EXISTS "Users can view transaction types in their workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can create transaction types in their workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can update transaction types in their workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can delete transaction types in their workspaces" ON transaction_types;

CREATE POLICY "Users can view transaction types in their workspaces" ON transaction_types
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = transaction_types.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create transaction types in their workspaces" ON transaction_types
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = transaction_types.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update transaction types in their workspaces" ON transaction_types
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = transaction_types.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete transaction types in their workspaces" ON transaction_types
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = transaction_types.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- WORKSPACES TABLE - Fix ambiguous column references
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;

CREATE POLICY "Users can view their workspaces" ON workspaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = workspaces.id 
            AND wm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- BALANCE_UPDATE_HISTORY TABLE - Fix ambiguous column references
-- ============================================================================
DROP POLICY IF EXISTS "Users can view balance updates in their workspaces" ON balance_update_history;
DROP POLICY IF EXISTS "Users can create balance updates in their workspaces" ON balance_update_history;

CREATE POLICY "Users can view balance updates in their workspaces" ON balance_update_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM accounts a
            JOIN workspace_members wm ON wm.workspace_id = a.workspace_id
            WHERE a.id = balance_update_history.account_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create balance updates in their workspaces" ON balance_update_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM accounts a
            JOIN workspace_members wm ON wm.workspace_id = a.workspace_id
            WHERE a.id = balance_update_history.account_id 
            AND wm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- RECONCILIATION_SESSIONS TABLE - Fix ambiguous column references
-- ============================================================================
DROP POLICY IF EXISTS "Users can view reconciliation sessions in their workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can create reconciliation sessions in their workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can update reconciliation sessions in their workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can delete reconciliation sessions in their workspaces" ON reconciliation_sessions;

CREATE POLICY "Users can view reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = reconciliation_sessions.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = reconciliation_sessions.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = reconciliation_sessions.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = reconciliation_sessions.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );
