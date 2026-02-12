-- Add initial_balance and is_default columns to accounts table
-- Requirements: 1.4, 1.7

-- Add initial_balance column
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Add is_default column
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for is_default for faster queries
CREATE INDEX IF NOT EXISTS idx_accounts_is_default ON accounts(is_default);

-- Update existing accounts to set initial_balance equal to current balance
-- This ensures existing accounts have a valid initial_balance
UPDATE accounts 
SET initial_balance = balance 
WHERE initial_balance = 0;

-- Mark the first account in each workspace as default if no default exists
WITH first_accounts AS (
  SELECT DISTINCT ON (workspace_id) 
    id, 
    workspace_id
  FROM accounts
  ORDER BY workspace_id, created_at ASC
)
UPDATE accounts
SET is_default = TRUE
FROM first_accounts
WHERE accounts.id = first_accounts.id
  AND NOT EXISTS (
    SELECT 1 FROM accounts a2 
    WHERE a2.workspace_id = accounts.workspace_id 
    AND a2.is_default = TRUE
  );

-- Add comment to document the columns
COMMENT ON COLUMN accounts.initial_balance IS 'Starting balance when account was created';
COMMENT ON COLUMN accounts.is_default IS 'Whether this is the default account for transactions';
