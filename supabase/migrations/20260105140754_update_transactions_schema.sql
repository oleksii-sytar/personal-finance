-- Update transactions schema to match design specification
-- Requirements: 10.5, 10.6

-- First, drop existing constraints and indexes that will change
DROP INDEX IF EXISTS idx_transactions_account_id;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

-- Update transactions table structure
ALTER TABLE transactions 
  DROP COLUMN IF EXISTS account_id,
  ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_expected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_transaction_id UUID,
  ADD COLUMN IF NOT EXISTS recurring_transaction_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID NOT NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Update transactions table constraints
ALTER TABLE transactions ALTER COLUMN category_id DROP NOT NULL;

-- Drop existing type constraint and add new one
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense'));

-- Update categories table structure
ALTER TABLE categories 
  ALTER COLUMN icon DROP NOT NULL,
  ALTER COLUMN color DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Add unique constraint for category names within workspace
ALTER TABLE categories 
  ADD CONSTRAINT categories_workspace_name_unique UNIQUE(workspace_id, name);

-- Create recurring_transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_data JSONB NOT NULL,
  frequency VARCHAR(10) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create expected_transactions table
CREATE TABLE IF NOT EXISTS expected_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_transaction_id UUID NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  expected_date DATE NOT NULL,
  expected_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'UAH',
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'skipped')),
  actual_transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraints for new transaction fields
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_expected_transaction_id_fkey 
    FOREIGN KEY (expected_transaction_id) REFERENCES expected_transactions(id),
  ADD CONSTRAINT transactions_recurring_transaction_id_fkey 
    FOREIGN KEY (recurring_transaction_id) REFERENCES recurring_transactions(id);

-- Create updated indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date ON transactions(workspace_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_expected ON transactions(is_expected);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_workspace ON recurring_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_due ON recurring_transactions(next_due_date);
CREATE INDEX IF NOT EXISTS idx_expected_transactions_workspace ON expected_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_expected_transactions_recurring ON expected_transactions(recurring_transaction_id);
CREATE INDEX IF NOT EXISTS idx_expected_transactions_due_date ON expected_transactions(expected_date);
CREATE INDEX IF NOT EXISTS idx_expected_transactions_status ON expected_transactions(status);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_recurring_transactions_updated_at 
  BEFORE UPDATE ON recurring_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for new tables
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expected_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_transactions
CREATE POLICY "Users can view recurring transactions in own workspaces" ON recurring_transactions
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recurring transactions in own workspaces" ON recurring_transactions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recurring transactions in own workspaces" ON recurring_transactions
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recurring transactions in own workspaces" ON recurring_transactions
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for expected_transactions
CREATE POLICY "Users can view expected transactions in own workspaces" ON expected_transactions
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expected transactions in own workspaces" ON expected_transactions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expected transactions in own workspaces" ON expected_transactions
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expected transactions in own workspaces" ON expected_transactions
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );