-- Restore account-based transactions for checkpoint reconciliation
-- Requirements: 1.2, 1.4, 7.1, 7.2
-- The checkpoint reconciliation feature requires account-based transactions

-- Add account_id column back to transactions table
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- Update existing transactions to use a default account
-- For each workspace, create a default "Cash" account if it doesn't exist
INSERT INTO accounts (workspace_id, name, type, balance, currency)
SELECT 
  w.id as workspace_id,
  'Cash' as name,
  'checking' as type,
  0 as balance,
  w.currency
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a 
  WHERE a.workspace_id = w.id AND a.name = 'Cash'
);

-- Update existing transactions to use the default "Cash" account
UPDATE transactions 
SET account_id = (
  SELECT a.id 
  FROM accounts a 
  WHERE a.workspace_id = transactions.workspace_id 
    AND a.name = 'Cash'
  LIMIT 1
)
WHERE account_id IS NULL;

-- Make account_id NOT NULL after updating existing records
ALTER TABLE transactions 
  ALTER COLUMN account_id SET NOT NULL;

-- Update RLS policies to include account-based filtering
-- Drop existing transaction policies
DROP POLICY IF EXISTS "Users can view transactions in own workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in own workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions in own workspaces" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions in own workspaces" ON transactions;

-- Create new account-aware transaction policies
CREATE POLICY "Users can view transactions in own workspace accounts" ON transactions
  FOR SELECT USING (
    account_id IN (
      SELECT a.id FROM accounts a
      JOIN workspaces w ON a.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions in own workspace accounts" ON transactions
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT a.id FROM accounts a
      JOIN workspaces w ON a.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transactions in own workspace accounts" ON transactions
  FOR UPDATE USING (
    account_id IN (
      SELECT a.id FROM accounts a
      JOIN workspaces w ON a.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  ) WITH CHECK (
    account_id IN (
      SELECT a.id FROM accounts a
      JOIN workspaces w ON a.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transactions in own workspace accounts" ON transactions
  FOR DELETE USING (
    account_id IN (
      SELECT a.id FROM accounts a
      JOIN workspaces w ON a.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- Create function to ensure default account exists for new workspaces
CREATE OR REPLACE FUNCTION create_default_account(workspace_id UUID, workspace_currency VARCHAR(3))
RETURNS UUID AS $$
DECLARE
  account_id UUID;
BEGIN
  -- Create default "Cash" account
  INSERT INTO accounts (workspace_id, name, type, balance, currency)
  VALUES (
    workspace_id,
    'Cash',
    'checking',
    0,
    workspace_currency
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO account_id;
  
  -- If conflict occurred, get the existing account ID
  IF account_id IS NULL THEN
    SELECT id INTO account_id 
    FROM accounts 
    WHERE workspace_id = workspace_id AND name = 'Cash'
    LIMIT 1;
  END IF;
  
  RETURN account_id;
END;
$$ LANGUAGE plpgsql;