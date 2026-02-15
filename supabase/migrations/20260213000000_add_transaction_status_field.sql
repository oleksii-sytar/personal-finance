-- Add transaction status field for planned vs completed transactions
-- Requirements: 2.3 (Future Transaction Planning)
-- Design: Section 2.1 (Transaction Status Field)
-- CRITICAL: This field determines if transaction affects actual balance

-- Add status column with CHECK constraint
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed'
CHECK (status IN ('completed', 'planned'));

-- Add planned_date for future transactions (max 6 months ahead)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS planned_date DATE
CHECK (planned_date IS NULL OR planned_date <= CURRENT_DATE + INTERVAL '6 months');

-- Add completed_at for tracking when planned became completed
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing transactions as 'completed'
-- All existing transactions are completed transactions
UPDATE transactions 
SET status = 'completed' 
WHERE status IS NULL;

-- Backfill completed_at with created_at for existing completed transactions
UPDATE transactions 
SET completed_at = created_at 
WHERE status = 'completed' AND completed_at IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_status 
ON transactions(status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_status_date 
ON transactions(status, transaction_date) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_planned_date 
ON transactions(planned_date) 
WHERE status = 'planned' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_account_status 
ON transactions(account_id, status) 
WHERE deleted_at IS NULL;

-- Add comment explaining the status field
COMMENT ON COLUMN transactions.status IS 'Transaction status: completed (affects balance) or planned (future transaction, does not affect current balance)';
COMMENT ON COLUMN transactions.planned_date IS 'Date when planned transaction is expected to occur (max 6 months ahead)';
COMMENT ON COLUMN transactions.completed_at IS 'Timestamp when transaction was marked as completed (for tracking planned -> completed conversion)';

-- Create view for ACTUAL balances (completed transactions only)
-- This ensures planned transactions never affect current balance calculations
CREATE OR REPLACE VIEW account_actual_balances AS
SELECT 
  a.id as account_id,
  a.name,
  a.initial_balance,
  COALESCE(SUM(
    CASE 
      WHEN t.type = 'income' THEN t.amount
      WHEN t.type = 'expense' THEN -t.amount
      WHEN t.type = 'transfer_in' THEN t.amount
      WHEN t.type = 'transfer_out' THEN -t.amount
      ELSE 0
    END
  ), 0) as transaction_sum,
  a.initial_balance + COALESCE(SUM(
    CASE 
      WHEN t.type = 'income' THEN t.amount
      WHEN t.type = 'expense' THEN -t.amount
      WHEN t.type = 'transfer_in' THEN t.amount
      WHEN t.type = 'transfer_out' THEN -t.amount
      ELSE 0
    END
  ), 0) as current_balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id 
  AND t.status = 'completed'  -- CRITICAL: Only completed transactions
  AND t.deleted_at IS NULL
GROUP BY a.id, a.name, a.initial_balance;

-- Add RLS policies remain unchanged (status filtering happens in application logic)
-- Existing RLS policies already handle workspace/account access control
