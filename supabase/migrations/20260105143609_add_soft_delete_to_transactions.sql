-- Add soft delete functionality to transactions table
-- Implements Requirement 6.4: Soft delete for admin recovery

-- Add deleted_at column for soft delete functionality
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for performance when filtering out deleted transactions
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);

-- Update RLS policies to exclude soft-deleted transactions from normal queries
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view transactions in own workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in own workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions in own workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions in own workspaces" ON transactions;

-- Recreate policies with soft delete filtering
CREATE POLICY "Users can view transactions in own workspaces" ON transactions
  FOR SELECT USING (
    deleted_at IS NULL AND
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions in own workspaces" ON transactions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transactions in own workspaces" ON transactions
  FOR UPDATE USING (
    deleted_at IS NULL AND
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Allow "delete" operations (which will be soft deletes) on non-deleted transactions
CREATE POLICY "Users can delete transactions in own workspaces" ON transactions
  FOR UPDATE USING (
    deleted_at IS NULL AND
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Create a view for admin recovery that includes soft-deleted transactions
CREATE OR REPLACE VIEW admin_transactions AS
SELECT 
  id,
  workspace_id,
  user_id,
  amount,
  original_amount,
  original_currency,
  currency,
  type,
  category_id,
  description,
  notes,
  transaction_date,
  is_expected,
  expected_transaction_id,
  recurring_transaction_id,
  created_at,
  updated_at,
  created_by,
  updated_by,
  deleted_at,
  CASE WHEN deleted_at IS NOT NULL THEN true ELSE false END as is_deleted
FROM transactions;

-- Grant access to admin view (for future admin role)
-- GRANT SELECT ON admin_transactions TO admin_role; -- Uncomment when admin role is created