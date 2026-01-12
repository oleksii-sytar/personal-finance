-- Add simplified checkpoint columns for timeline system
-- Requirements: 6.1, 4.4, 4.5
-- Adds expected_balance and gap columns to checkpoints table for simplified checkpoint timeline

-- Add new columns to checkpoints table
ALTER TABLE checkpoints 
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS actual_balance DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS expected_balance DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS gap DECIMAL(12,2);

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_checkpoints_date ON checkpoints(date DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_account_id ON checkpoints(account_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_account_date ON checkpoints(account_id, date DESC);

-- Add comment to explain the simplified structure
COMMENT ON COLUMN checkpoints.date IS 'Date of the checkpoint snapshot';
COMMENT ON COLUMN checkpoints.account_id IS 'Account this checkpoint belongs to';
COMMENT ON COLUMN checkpoints.actual_balance IS 'Actual balance as reported by user';
COMMENT ON COLUMN checkpoints.expected_balance IS 'Expected balance calculated from transactions';
COMMENT ON COLUMN checkpoints.gap IS 'Gap between actual and expected balance (actual - expected)';

-- Add constraint to ensure only one checkpoint per account per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkpoints_account_date_unique 
  ON checkpoints(account_id, date) 
  WHERE account_id IS NOT NULL AND date IS NOT NULL;