-- Add transaction types table for custom transaction type management
-- Requirements: 8.1, 8.2, 8.3, 8.4, 8.5

-- Create transaction_types table
CREATE TABLE IF NOT EXISTS transaction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  family VARCHAR(10) NOT NULL CHECK (family IN ('income', 'expense')),
  description TEXT,
  icon VARCHAR(10),
  color VARCHAR(7),
  is_system BOOLEAN NOT NULL DEFAULT FALSE, -- System types cannot be deleted
  is_default BOOLEAN NOT NULL DEFAULT FALSE, -- Default type for the family
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- Add transaction_type_id column to transactions table
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS transaction_type_id UUID REFERENCES transaction_types(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_types_workspace ON transaction_types(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transaction_types_family ON transaction_types(family);
CREATE INDEX IF NOT EXISTS idx_transaction_types_is_default ON transaction_types(is_default);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type_id);

-- Add updated_at trigger for transaction_types
CREATE TRIGGER update_transaction_types_updated_at 
  BEFORE UPDATE ON transaction_types 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE transaction_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_types
CREATE POLICY "Users can view transaction types in own workspaces" ON transaction_types
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transaction types in own workspaces" ON transaction_types
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transaction types in own workspaces" ON transaction_types
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  ) WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transaction types in own workspaces" ON transaction_types
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) AND is_system = FALSE -- Cannot delete system types
  );

-- Insert default system transaction types for existing workspaces
-- These will be created for new workspaces via the workspace creation process
INSERT INTO transaction_types (workspace_id, name, family, description, icon, color, is_system, is_default)
SELECT 
  w.id as workspace_id,
  'Income' as name,
  'income' as family,
  'General income' as description,
  '💰' as icon,
  '#4E7A58' as color,
  TRUE as is_system,
  TRUE as is_default
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_types tt 
  WHERE tt.workspace_id = w.id AND tt.name = 'Income' AND tt.family = 'income'
);

INSERT INTO transaction_types (workspace_id, name, family, description, icon, color, is_system, is_default)
SELECT 
  w.id as workspace_id,
  'Expense' as name,
  'expense' as family,
  'General expense' as description,
  '💸' as icon,
  '#8B7355' as color,
  TRUE as is_system,
  TRUE as is_default
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_types tt 
  WHERE tt.workspace_id = w.id AND tt.name = 'Expense' AND tt.family = 'expense'
);

-- Insert special "Other" type for reconciliation (Requirement 8.4)
INSERT INTO transaction_types (workspace_id, name, family, description, icon, color, is_system, is_default)
SELECT 
  w.id as workspace_id,
  'Other' as name,
  'expense' as family,
  'Gap reconciliation and miscellaneous transactions' as description,
  '📝' as icon,
  '#6B7280' as color,
  TRUE as is_system,
  FALSE as is_default
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_types tt 
  WHERE tt.workspace_id = w.id AND tt.name = 'Other'
);

-- Update existing transactions to use default transaction types
-- Map income transactions to default income type
UPDATE transactions 
SET transaction_type_id = (
  SELECT tt.id 
  FROM transaction_types tt 
  WHERE tt.workspace_id = transactions.workspace_id 
    AND tt.family = 'income' 
    AND tt.is_default = TRUE
  LIMIT 1
)
WHERE type = 'income' AND transaction_type_id IS NULL;

-- Map expense transactions to default expense type
UPDATE transactions 
SET transaction_type_id = (
  SELECT tt.id 
  FROM transaction_types tt 
  WHERE tt.workspace_id = transactions.workspace_id 
    AND tt.family = 'expense' 
    AND tt.is_default = TRUE
  LIMIT 1
)
WHERE type = 'expense' AND transaction_type_id IS NULL;

-- Create function to ensure default types exist for new workspaces
CREATE OR REPLACE FUNCTION create_default_transaction_types(workspace_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Create default income type
  INSERT INTO transaction_types (workspace_id, name, family, description, icon, color, is_system, is_default)
  VALUES (
    workspace_id,
    'Income',
    'income',
    'General income',
    '💰',
    '#4E7A58',
    TRUE,
    TRUE
  )
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- Create default expense type
  INSERT INTO transaction_types (workspace_id, name, family, description, icon, color, is_system, is_default)
  VALUES (
    workspace_id,
    'Expense',
    'expense',
    'General expense',
    '💸',
    '#8B7355',
    TRUE,
    TRUE
  )
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- Create special "Other" type for reconciliation
  INSERT INTO transaction_types (workspace_id, name, family, description, icon, color, is_system, is_default)
  VALUES (
    workspace_id,
    'Other',
    'expense',
    'Gap reconciliation and miscellaneous transactions',
    '📝',
    '#6B7280',
    TRUE,
    FALSE
  )
  ON CONFLICT (workspace_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;