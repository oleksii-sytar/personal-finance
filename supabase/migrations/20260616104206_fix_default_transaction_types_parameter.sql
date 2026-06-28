DROP FUNCTION IF EXISTS create_default_transaction_types(UUID);

CREATE FUNCTION create_default_transaction_types(p_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Create default income type
  INSERT INTO transaction_types (workspace_id, name, family, description, icon, color, is_system, is_default)
  VALUES (
    p_workspace_id,
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
    p_workspace_id,
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
    p_workspace_id,
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

SELECT create_default_transaction_types(id)
FROM workspaces;
