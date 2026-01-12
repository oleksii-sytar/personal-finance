-- Create reconciliation_sessions table for tracking multi-step reconciliation workflows
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

CREATE TABLE reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  current_step TEXT NOT NULL CHECK (current_step IN (
    'checkpoint_creation',
    'gap_analysis', 
    'gap_resolution',
    'transaction_review',
    'final_validation',
    'period_closure',
    'completion'
  )),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  gaps_remaining INTEGER NOT NULL DEFAULT 0 CHECK (gaps_remaining >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_reconciliation_sessions_workspace_id ON reconciliation_sessions(workspace_id);
CREATE INDEX idx_reconciliation_sessions_checkpoint_id ON reconciliation_sessions(checkpoint_id);
CREATE INDEX idx_reconciliation_sessions_status ON reconciliation_sessions(status);
CREATE INDEX idx_reconciliation_sessions_last_activity ON reconciliation_sessions(last_activity_at);

-- Create composite index for finding active sessions by checkpoint
CREATE INDEX idx_reconciliation_sessions_checkpoint_status ON reconciliation_sessions(checkpoint_id, status) 
WHERE status IN ('active', 'paused');

-- Enable RLS
ALTER TABLE reconciliation_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own workspace reconciliation sessions" ON reconciliation_sessions
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create reconciliation sessions in own workspaces" ON reconciliation_sessions
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
      )
    )
  );

CREATE POLICY "Users can update own workspace reconciliation sessions" ON reconciliation_sessions
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
      )
    )
  );

CREATE POLICY "Users can delete own workspace reconciliation sessions" ON reconciliation_sessions
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reconciliation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reconciliation_sessions_updated_at
  BEFORE UPDATE ON reconciliation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_reconciliation_sessions_updated_at();

-- Add helpful comments
COMMENT ON TABLE reconciliation_sessions IS 'Tracks multi-step reconciliation workflow sessions for guided gap resolution';
COMMENT ON COLUMN reconciliation_sessions.current_step IS 'Current step in the reconciliation workflow';
COMMENT ON COLUMN reconciliation_sessions.progress_percentage IS 'Percentage completion of the reconciliation workflow (0-100)';
COMMENT ON COLUMN reconciliation_sessions.gaps_remaining IS 'Number of unresolved gaps remaining in the session';
COMMENT ON COLUMN reconciliation_sessions.metadata IS 'Session metadata including device type, resolution methods used, and timing data';
COMMENT ON COLUMN reconciliation_sessions.status IS 'Session status: active (in progress), paused (user navigated away), completed (successfully finished), abandoned (user gave up)';