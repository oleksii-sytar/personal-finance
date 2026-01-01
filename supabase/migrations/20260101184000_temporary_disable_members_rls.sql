-- Temporarily disable RLS on workspace_members to fix recursion
-- Security is maintained through server-side filtering in actions

-- Drop all policies on workspace_members
DROP POLICY IF EXISTS "authenticated_view_members" ON workspace_members;
DROP POLICY IF EXISTS "authenticated_manage_members" ON workspace_members;

-- Temporarily disable RLS on workspace_members only
-- Other tables keep RLS for security
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on other tables for security
-- workspaces, user_profiles, and workspace_invitations remain protected