-- Archive and remove checkpoint system
-- Task: 1. Archive and remove checkpoint system
-- Requirements: Checkpoint System Removal section

BEGIN;

-- Step 1: Create archive tables to preserve historical checkpoint data
CREATE TABLE IF NOT EXISTS checkpoints_archive (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  account_balances JSONB NOT NULL,
  expected_balances JSONB NOT NULL,
  gaps JSONB NOT NULL,
  status VARCHAR(10) NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliation_periods_archive (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  start_checkpoint_id UUID NOT NULL,
  end_checkpoint_id UUID,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status VARCHAR(10) NOT NULL,
  total_transactions INTEGER NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  pattern_learning_completed BOOLEAN NOT NULL,
  locked_transactions UUID[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Copy existing checkpoint data to archive tables
INSERT INTO checkpoints_archive (
  id, workspace_id, created_at, created_by, account_balances, 
  expected_balances, gaps, status, notes, updated_at
)
SELECT 
  id, workspace_id, created_at, created_by, account_balances,
  expected_balances, gaps, status, notes, updated_at
FROM checkpoints;

INSERT INTO reconciliation_periods_archive (
  id, workspace_id, start_checkpoint_id, end_checkpoint_id,
  start_date, end_date, status, total_transactions, total_amount,
  pattern_learning_completed, locked_transactions, created_at, updated_at
)
SELECT 
  id, workspace_id, start_checkpoint_id, end_checkpoint_id,
  start_date, end_date, status, total_transactions, total_amount,
  pattern_learning_completed, locked_transactions, created_at, updated_at
FROM reconciliation_periods;

-- Step 3: Migrate last checkpoint balance to current_balance for each account
-- This ensures accounts have a starting point for real-time reconciliation
-- Note: This assumes accounts table already has current_balance column from migration 2.1
-- If not, this will be handled in the next migration

-- We'll extract the last checkpoint's actual_balance for each account from the JSONB
-- The account_balances JSONB structure is: [{"account_id": "...", "actual_balance": ...}, ...]
WITH latest_checkpoints AS (
  SELECT DISTINCT ON (workspace_id)
    workspace_id,
    account_balances,
    created_at
  FROM checkpoints
  ORDER BY workspace_id, created_at DESC
),
account_balances_extracted AS (
  SELECT 
    lc.workspace_id,
    (jsonb_array_elements(lc.account_balances)->>'account_id')::UUID as account_id,
    (jsonb_array_elements(lc.account_balances)->>'actual_balance')::DECIMAL(15,2) as actual_balance
  FROM latest_checkpoints lc
)
UPDATE accounts a
SET 
  current_balance = abe.actual_balance,
  current_balance_updated_at = NOW()
FROM account_balances_extracted abe
WHERE a.id = abe.account_id
  AND a.workspace_id = abe.workspace_id
  AND a.current_balance IS NOT NULL; -- Only update if current_balance column exists

-- Step 4: Remove locked field from transactions table
-- This field was only used by the checkpoint system
ALTER TABLE transactions DROP COLUMN IF EXISTS locked;

-- Step 5: Drop triggers before dropping tables
DROP TRIGGER IF EXISTS update_checkpoints_updated_at ON checkpoints;
DROP TRIGGER IF EXISTS update_reconciliation_periods_updated_at ON reconciliation_periods;

-- Step 6: Drop the active checkpoint tables (CASCADE will drop foreign keys)
DROP TABLE IF EXISTS reconciliation_periods CASCADE;
DROP TABLE IF EXISTS checkpoints CASCADE;

-- Step 7: Add indexes to archive tables for historical queries
CREATE INDEX IF NOT EXISTS idx_checkpoints_archive_workspace_id 
  ON checkpoints_archive(workspace_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_archive_created_at 
  ON checkpoints_archive(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_archive_archived_at 
  ON checkpoints_archive(archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_reconciliation_periods_archive_workspace_id 
  ON reconciliation_periods_archive(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_periods_archive_start_date 
  ON reconciliation_periods_archive(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_periods_archive_archived_at 
  ON reconciliation_periods_archive(archived_at DESC);

-- Step 8: Add comments to archive tables for documentation
COMMENT ON TABLE checkpoints_archive IS 
  'Archived checkpoint data from the legacy checkpoint-based reconciliation system. Preserved for historical reference only.';
COMMENT ON TABLE reconciliation_periods_archive IS 
  'Archived reconciliation period data from the legacy checkpoint-based reconciliation system. Preserved for historical reference only.';

COMMIT;
