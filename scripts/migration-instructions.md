# Apply Migration: Add initial_balance and is_default columns

## Migration File
`supabase/migrations/20260204000000_add_accounts_initial_balance_and_default.sql`

## Why This Migration is Needed
The accounts table is missing two required columns from the design:
- `initial_balance` (DECIMAL) - Tracks the starting balance when account was created
- `is_default` (BOOLEAN) - Marks which account is the default for transactions

## How to Apply (Supabase Dashboard SQL Editor)

### Step 1: Open SQL Editor
Go to: https://supabase.com/dashboard/project/szspuivemixdjzyohwrc/sql/new

### Step 2: Copy the Migration SQL
The migration SQL is below. Copy everything from `-- Add initial_balance` to the end:

```sql
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
```

### Step 3: Execute in SQL Editor
1. Paste the SQL into the editor
2. Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)
3. Wait for confirmation message

### Step 4: Verify Migration
Run this query to verify the columns were added:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'accounts'
AND column_name IN ('initial_balance', 'is_default')
ORDER BY column_name;
```

You should see:
- `initial_balance` | numeric | NO | 0
- `is_default` | boolean | NO | false

### Step 5: Run Tests
After the migration is applied, run the account tests:

```bash
npm run test -- account
```

All tests should pass once the schema is updated.

## What This Migration Does

1. **Adds `initial_balance` column** - Stores the starting balance when account was created
2. **Adds `is_default` column** - Marks which account is the default for transactions
3. **Creates index** - Speeds up queries filtering by `is_default`
4. **Migrates existing data** - Sets `initial_balance` to current `balance` for existing accounts
5. **Sets default accounts** - Marks the first account in each workspace as default if none exists
6. **Adds documentation** - Comments explain the purpose of each column

## Troubleshooting

### If you get "column already exists" error
This is fine - it means the column was already added. The migration uses `IF NOT EXISTS` to be idempotent.

### If you get permission errors
Make sure you're logged into the correct Supabase project and have admin access.

### If tests still fail after migration
1. Verify the columns exist (use the verification query above)
2. Check that existing accounts have `initial_balance` set
3. Check that at least one account per workspace has `is_default = TRUE`
