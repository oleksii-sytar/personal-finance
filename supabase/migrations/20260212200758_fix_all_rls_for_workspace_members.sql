-- Comprehensive RLS fix for ALL workspace-related tables
-- Ensures that workspace MEMBERS (not just owners) have proper access
-- This fixes the critical issue where invited users cannot use the application

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view categories in own workspaces" ON categories;
DROP POLICY IF EXISTS "Users can create categories in own workspaces" ON categories;
DROP POLICY IF EXISTS "Users can update categories in own workspaces" ON categories;
DROP POLICY IF EXISTS "Users can delete categories in own workspaces" ON categories;
DROP POLICY IF EXISTS "Users can view categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can create categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can update categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can delete categories in their workspaces" ON categories;

CREATE POLICY "Users can view categories in their workspaces" ON categories
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create categories in their workspaces" ON categories
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories in their workspaces" ON categories
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete categories in their workspaces" ON categories
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- TRANSACTION_TYPES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view transaction types in own workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can create transaction types in own workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can update transaction types in own workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can delete transaction types in own workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can view transaction types in their workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can create transaction types in their workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can update transaction types in their workspaces" ON transaction_types;
DROP POLICY IF EXISTS "Users can delete transaction types in their workspaces" ON transaction_types;

CREATE POLICY "Users can view transaction types in their workspaces" ON transaction_types
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create transaction types in their workspaces" ON transaction_types
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update transaction types in their workspaces" ON transaction_types
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete transaction types in their workspaces" ON transaction_types
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- WORKSPACES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view member workspaces" ON workspaces;
DROP POLICY IF EXISTS "view_member_workspaces" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_read_access" ON workspaces;

-- Members can view workspaces they belong to
CREATE POLICY "Users can view their workspaces" ON workspaces
    FOR SELECT USING (
        id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- Only owners can create/update/delete workspaces (this is correct)
DROP POLICY IF EXISTS "Users can create own workspaces" ON workspaces;
DROP POLICY IF EXISTS "manage_own_workspaces" ON workspaces;
DROP POLICY IF EXISTS "workspace_owners_full_access" ON workspaces;

CREATE POLICY "Owners can manage their workspaces" ON workspaces
    FOR ALL USING (owner_id = auth.uid());

-- ============================================================================
-- BALANCE_UPDATE_HISTORY TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view balance updates in own workspaces" ON balance_update_history;
DROP POLICY IF EXISTS "Users can create balance updates in own workspaces" ON balance_update_history;
DROP POLICY IF EXISTS "Users can view balance updates in their workspaces" ON balance_update_history;
DROP POLICY IF EXISTS "Users can create balance updates in their workspaces" ON balance_update_history;

CREATE POLICY "Users can view balance updates in their workspaces" ON balance_update_history
    FOR SELECT USING (
        account_id IN (
            SELECT id FROM accounts WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create balance updates in their workspaces" ON balance_update_history
    FOR INSERT WITH CHECK (
        account_id IN (
            SELECT id FROM accounts WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- RECONCILIATION_SESSIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view reconciliation sessions in own workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can create reconciliation sessions in own workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can update reconciliation sessions in own workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can delete reconciliation sessions in own workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can view reconciliation sessions in their workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can create reconciliation sessions in their workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can update reconciliation sessions in their workspaces" ON reconciliation_sessions;
DROP POLICY IF EXISTS "Users can delete reconciliation sessions in their workspaces" ON reconciliation_sessions;

CREATE POLICY "Users can view reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete reconciliation sessions in their workspaces" ON reconciliation_sessions
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- EXCHANGE_RATES TABLE (public read access - no workspace relation)
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Public read access to exchange rates" ON exchange_rates;

CREATE POLICY "Anyone can view exchange rates" ON exchange_rates
    FOR SELECT USING (true);

-- Only authenticated users can insert/update exchange rates (for caching)
DROP POLICY IF EXISTS "Authenticated users can manage exchange rates" ON exchange_rates;

CREATE POLICY "Authenticated users can manage exchange rates" ON exchange_rates
    FOR ALL USING (auth.role() = 'authenticated');
