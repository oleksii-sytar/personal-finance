-- Fix workspace_invitations RLS policies to avoid auth.users access issues
-- The problem is that RLS policies cannot directly access auth.users table

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can accept invitations sent to them" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can join workspaces via invitation" ON workspace_members;

-- Create a function to get current user's email safely
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies that use the function instead of direct auth.users access
CREATE POLICY "Users can view invitations sent to them" ON workspace_invitations
    FOR SELECT USING (
        email = get_current_user_email()
    );

CREATE POLICY "Users can accept invitations sent to them" ON workspace_invitations
    FOR UPDATE USING (
        email = get_current_user_email() AND
        expires_at > NOW() AND
        accepted_at IS NULL
    );

-- Fix the workspace_members policy to use the function
CREATE POLICY "Users can join workspaces via invitation" ON workspace_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        workspace_id IN (
            SELECT workspace_id FROM workspace_invitations 
            WHERE email = get_current_user_email()
            AND expires_at > NOW()
            AND accepted_at IS NULL
        )
    );

-- Also create a simpler policy for workspace owners to view invitations
-- This ensures the query in the error log will work
DROP POLICY IF EXISTS "Workspace owners can view invitations" ON workspace_invitations;

CREATE POLICY "Workspace owners can view invitations" ON workspace_invitations
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );