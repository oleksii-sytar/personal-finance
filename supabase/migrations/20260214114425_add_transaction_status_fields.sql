-- Add status, planned_date, and completed_at fields to transactions table
-- Implements Requirements 3.1, 3.3, 3.4: Planned transaction support

-- Add status column (default to 'completed' for existing transactions)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed' 
CHECK (status IN ('completed', 'planned'));

-- Add planned_date column (nullable, only used for planned transactions)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS planned_date DATE;

-- Add completed_at column (nullable, set when planned transaction is marked as completed)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add index for status queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add index for planned_date queries (performance optimization for future transaction queries)
CREATE INDEX IF NOT EXISTS idx_transactions_planned_date ON transactions(planned_date) WHERE status = 'planned';

-- Add comment explaining the status field
COMMENT ON COLUMN transactions.status IS 'Transaction status: completed (affects balance) or planned (future transaction, does not affect balance)';
COMMENT ON COLUMN transactions.planned_date IS 'Original planned date for future transactions. Cleared when marked as completed.';
COMMENT ON COLUMN transactions.completed_at IS 'Timestamp when a planned transaction was marked as completed.';
