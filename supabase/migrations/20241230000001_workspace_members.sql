-- Add workspace member management tables
-- Following the design document specifications

-- Create user_profiles table to extend Supabase auth.users
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspace_members table
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Create workspace_invitations table
CREATE TABLE workspace_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID REFERENCES auth.users(id) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, email)
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_id ON user_profiles(id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_expires_at ON workspace_invitations(expires_at);

-- Add updated_at trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can view profiles of workspace members
CREATE POLICY "Users can view workspace member profiles" ON user_profiles
    FOR SELECT USING (
        id IN (
            SELECT user_id FROM workspace_members wm
            WHERE wm.workspace_id IN (
                SELECT workspace_id FROM workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for workspace_members
CREATE POLICY "Users can view members of their workspaces" ON workspace_members
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners can manage members" ON workspace_members
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- Users can insert themselves as members when accepting invitations
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

-- RLS Policies for workspace_invitations
CREATE POLICY "Workspace owners can view invitations" ON workspace_invitations
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners can create invitations" ON workspace_invitations
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        ) AND
        invited_by = auth.uid()
    );

CREATE POLICY "Workspace owners can update invitations" ON workspace_invitations
    FOR UPDATE USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners can delete invitations" ON workspace_invitations
    FOR DELETE USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- Invitees can view their own invitations
CREATE POLICY "Users can view invitations sent to them" ON workspace_invitations
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Invitees can update their own invitations (to accept them)
CREATE POLICY "Users can accept invitations sent to them" ON workspace_invitations
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND
        expires_at > NOW() AND
        accepted_at IS NULL
    );

-- Function to automatically add workspace creator as owner
CREATE OR REPLACE FUNCTION add_workspace_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add workspace creator as owner
CREATE TRIGGER add_workspace_owner_trigger
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION add_workspace_owner();

-- Function to get current user's workspace context
CREATE OR REPLACE FUNCTION get_user_workspace_context()
RETURNS TABLE (
    workspace_id UUID,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT wm.workspace_id, wm.role
    FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    LIMIT 1; -- For now, users have one active workspace
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user profile creation on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, full_name)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing RLS policies for workspaces to work with workspace_members
DROP POLICY "Users can view own workspaces" ON workspaces;
DROP POLICY "Users can update own workspaces" ON workspaces;
DROP POLICY "Users can delete own workspaces" ON workspaces;

-- New RLS policies for workspaces that consider workspace membership
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners can update workspaces" ON workspaces
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can delete workspaces" ON workspaces
    FOR DELETE USING (auth.uid() = owner_id);

-- Update RLS policies for other tables to work with workspace membership
DROP POLICY "Users can view accounts in own workspaces" ON accounts;
DROP POLICY "Users can create accounts in own workspaces" ON accounts;
DROP POLICY "Users can update accounts in own workspaces" ON accounts;
DROP POLICY "Users can delete accounts in own workspaces" ON accounts;

CREATE POLICY "Users can view accounts in their workspaces" ON accounts
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create accounts in their workspaces" ON accounts
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update accounts in their workspaces" ON accounts
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete accounts in their workspaces" ON accounts
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Update RLS policies for categories
DROP POLICY "Users can view categories in own workspaces" ON categories;
DROP POLICY "Users can create categories in own workspaces" ON categories;
DROP POLICY "Users can update categories in own workspaces" ON categories;
DROP POLICY "Users can delete categories in own workspaces" ON categories;

CREATE POLICY "Users can view categories in their workspaces" ON categories
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create categories in their workspaces" ON categories
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories in their workspaces" ON categories
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete categories in their workspaces" ON categories
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Update RLS policies for transactions
DROP POLICY "Users can view transactions in own workspaces" ON transactions;
DROP POLICY "Users can create transactions in own workspaces" ON transactions;
DROP POLICY "Users can update transactions in own workspaces" ON transactions;
DROP POLICY "Users can delete transactions in own workspaces" ON transactions;

CREATE POLICY "Users can view transactions in their workspaces" ON transactions
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create transactions in their workspaces" ON transactions
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update transactions in their workspaces" ON transactions
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete transactions in their workspaces" ON transactions
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );