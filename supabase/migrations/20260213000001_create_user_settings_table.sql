-- Create user_settings table for forecast preferences
-- This table stores user-specific settings for forecast calculations and risk thresholds

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Forecast preferences
  minimum_safe_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  safety_buffer_days INTEGER NOT NULL DEFAULT 7 CHECK (safety_buffer_days >= 1 AND safety_buffer_days <= 30),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one settings record per user per workspace
  UNIQUE(user_id, workspace_id)
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own settings
CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient lookups by user and workspace
CREATE INDEX idx_user_settings_user_workspace 
ON user_settings(user_id, workspace_id);

-- Index for workspace lookups (for admin queries)
CREATE INDEX idx_user_settings_workspace 
ON user_settings(workspace_id);

-- Add comment for documentation
COMMENT ON TABLE user_settings IS 'Stores user-specific forecast preferences and risk thresholds';
COMMENT ON COLUMN user_settings.minimum_safe_balance IS 'User-defined minimum safe balance threshold for risk warnings (default: 0.00)';
COMMENT ON COLUMN user_settings.safety_buffer_days IS 'Number of days of spending to maintain as safety buffer (default: 7, range: 1-30)';
