-- Migration: Add reconciliation fields to accounts
-- Feature: Real-Time Balance Reconciliation
-- Task: 2.1 Create migration to add reconciliation fields to accounts table

BEGIN;

-- Add new columns
ALTER TABLE accounts 
  ADD COLUMN opening_balance DECIMAL(15,2),
  ADD COLUMN current_balance DECIMAL(15,2),
  ADD COLUMN current_balance_updated_at TIMESTAMP WITH TIME ZONE;

-- Migrate existing balance to both fields
UPDATE accounts 
SET opening_balance = balance,
    current_balance = balance,
    current_balance_updated_at = NOW()
WHERE opening_balance IS NULL;

-- Make columns NOT NULL after migration
ALTER TABLE accounts 
  ALTER COLUMN opening_balance SET NOT NULL,
  ALTER COLUMN current_balance SET NOT NULL;

-- Drop old balance column
ALTER TABLE accounts DROP COLUMN balance;

-- Add immutability constraint
CREATE OR REPLACE FUNCTION prevent_opening_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.opening_balance IS DISTINCT FROM NEW.opening_balance THEN
    RAISE EXCEPTION 'opening_balance cannot be modified after account creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_opening_balance_modification
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_opening_balance_change();

-- Create balance update history table
CREATE TABLE balance_update_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  old_balance DECIMAL(15,2) NOT NULL,
  new_balance DECIMAL(15,2) NOT NULL,
  difference DECIMAL(15,2) NOT NULL,
  updated_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_balance_update_history_account 
  ON balance_update_history(account_id, updated_at DESC);
CREATE INDEX idx_balance_update_history_workspace 
  ON balance_update_history(workspace_id, updated_at DESC);

COMMIT;
