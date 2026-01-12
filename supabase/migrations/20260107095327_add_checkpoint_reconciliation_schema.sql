-- Add checkpoint reconciliation schema
-- Requirements: 1.6, 4.2, 4.5
-- Creates checkpoints table, reconciliation_periods table, and adds locked status to transactions

-- Create checkpoints table
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  account_balances JSONB NOT NULL, -- Array of AccountBalance objects
  expected_balances JSONB NOT NULL, -- Array of AccountBalance objects  
  gaps JSONB NOT NULL, -- Array of ReconciliationGap objects
  status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reconciliation_periods table
CREATE TABLE reconciliation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  start_checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  end_checkpoint_id UUID REFERENCES checkpoints(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  pattern_learning_completed BOOLEAN NOT NULL DEFAULT FALSE,
  locked_transactions UUID[] NOT NULL DEFAULT '{}', -- Array of transaction IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add locked field to transactions table for period closure
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Create indexes for performance optimization
CREATE INDEX idx_checkpoints_workspace_id ON checkpoints(workspace_id);
CREATE INDEX idx_checkpoints_created_at ON checkpoints(created_at DESC);
CREATE INDEX idx_checkpoints_status ON checkpoints(status);
CREATE INDEX idx_checkpoints_created_by ON checkpoints(created_by);

CREATE INDEX idx_reconciliation_periods_workspace_id ON reconciliation_periods(workspace_id);
CREATE INDEX idx_reconciliation_periods_status ON reconciliation_periods(status);
CREATE INDEX idx_reconciliation_periods_start_date ON reconciliation_periods(start_date DESC);
CREATE INDEX idx_reconciliation_periods_start_checkpoint ON reconciliation_periods(start_checkpoint_id);
CREATE INDEX idx_reconciliation_periods_end_checkpoint ON reconciliation_periods(end_checkpoint_id);

CREATE INDEX idx_transactions_locked ON transactions(locked);
CREATE INDEX idx_transactions_workspace_locked ON transactions(workspace_id, locked);

-- Add updated_at triggers
CREATE TRIGGER update_checkpoints_updated_at 
  BEFORE UPDATE ON checkpoints 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_periods_updated_at 
  BEFORE UPDATE ON reconciliation_periods 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkpoints
CREATE POLICY "Users can view checkpoints in own workspaces" ON checkpoints
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create checkpoints in own workspaces" ON checkpoints
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update checkpoints in own workspaces" ON checkpoints
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete checkpoints in own workspaces" ON checkpoints
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for reconciliation_periods
CREATE POLICY "Users can view reconciliation periods in own workspaces" ON reconciliation_periods
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reconciliation periods in own workspaces" ON reconciliation_periods
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reconciliation periods in own workspaces" ON reconciliation_periods
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete reconciliation periods in own workspaces" ON reconciliation_periods
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Add constraint to ensure only one active reconciliation period per workspace
CREATE UNIQUE INDEX idx_reconciliation_periods_workspace_active 
  ON reconciliation_periods(workspace_id) 
  WHERE status = 'active';

-- Add constraint to ensure start_date is before end_date when end_date is set
ALTER TABLE reconciliation_periods 
  ADD CONSTRAINT reconciliation_periods_date_order_check 
  CHECK (end_date IS NULL OR start_date < end_date);

-- Add constraint to ensure end_checkpoint_id is set when status is closed
ALTER TABLE reconciliation_periods 
  ADD CONSTRAINT reconciliation_periods_closed_end_checkpoint_check 
  CHECK (status != 'closed' OR end_checkpoint_id IS NOT NULL);