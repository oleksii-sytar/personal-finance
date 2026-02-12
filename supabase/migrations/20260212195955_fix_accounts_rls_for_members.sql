-- Fix RLS policies for accounts to allow workspace members (not just owners) to manage accounts
-- This fixes the issue where invited users cannot create accounts

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can update accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can delete accounts in their workspaces" ON accounts;

-- Create new policies that check workspace membership (not just ownership)
CREATE POLICY "Users can view accounts in their workspaces" ON accounts
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create accounts in their workspaces" ON accounts
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update accounts in their workspaces" ON accounts
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete accounts in their workspaces" ON accounts
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );
