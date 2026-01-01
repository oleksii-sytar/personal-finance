-- Fix infinite recursion in workspace_members RLS policies
-- The issue is that policies are referencing workspace_members table within workspace_members policies

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces via invitation" ON workspace_members;

-- Create simpler, non-recursive policies for workspace_members
CREATE POLICY "Users can view workspace members" ON workspace_members
    FOR SELECT USING (
        -- Users can see members of workspaces they own
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        ) OR
        -- Users can see themselves in any workspace
        user_id = auth.uid()
    );

CREATE POLICY "Users can join workspaces via invitation" ON workspace_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        workspace_id IN (
            SELECT workspace_id FROM workspace_invitations 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND expires_at > NOW()
            AND accepted_at IS NULL
        )
    );

-- Update other policies to use direct workspace ownership check instead of workspace_members lookup
-- This avoids the recursion issue

-- Update accounts policies
DROP POLICY IF EXISTS "Users can view accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can update accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can delete accounts in their workspaces" ON accounts;

CREATE POLICY "Users can view accounts in their workspaces" ON accounts
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create accounts in their workspaces" ON accounts
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update accounts in their workspaces" ON accounts
    FOR UPDATE USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete accounts in their workspaces" ON accounts
    FOR DELETE USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- Update categories policies
DROP POLICY IF EXISTS "Users can view categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can create categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can update categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can delete categories in their workspaces" ON categories;

CREATE POLICY "Users can view categories in their workspaces" ON categories
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create categories in their workspaces" ON categories
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories in their workspaces" ON categories
    FOR UPDATE USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete categories in their workspaces" ON categories
    FOR DELETE USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- Update transactions policies
DROP POLICY IF EXISTS "Users can view transactions in their workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions in their workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions in their workspaces" ON transactions;

CREATE POLICY "Users can view transactions in their workspaces" ON transactions
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create transactions in their workspaces" ON transactions
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update transactions in their workspaces" ON transactions
    FOR UPDATE USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete transactions in their workspaces" ON transactions
    FOR DELETE USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- Simplify workspace policies to avoid recursion
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;

CREATE POLICY "Users can view workspaces they belong to" ON workspaces
    FOR SELECT USING (
        owner_id = auth.uid()
        -- For now, only owners can see workspaces
        -- Multi-user workspace support can be added later without recursion
    );