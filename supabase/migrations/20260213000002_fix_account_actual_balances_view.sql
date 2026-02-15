-- Fix account_actual_balances view to use correct column names
-- Task: 3.2 Update balance calculation logic
-- Issue: View was using initial_balance but table has opening_balance

-- Drop the old view
DROP VIEW IF EXISTS account_actual_balances;

-- Recreate view with correct column names
-- This ensures planned transactions never affect current balance calculations
CREATE OR REPLACE VIEW account_actual_balances AS
SELECT 
  a.id as account_id,
  a.name,
  a.opening_balance,
  COALESCE(SUM(
    CASE 
      WHEN t.type = 'income' THEN t.amount
      WHEN t.type = 'expense' THEN -t.amount
      ELSE 0
    END
  ), 0) as transaction_sum,
  a.opening_balance + COALESCE(SUM(
    CASE 
      WHEN t.type = 'income' THEN t.amount
      WHEN t.type = 'expense' THEN -t.amount
      ELSE 0
    END
  ), 0) as calculated_balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id 
  AND t.status = 'completed'  -- CRITICAL: Only completed transactions affect balance
  AND t.deleted_at IS NULL
GROUP BY a.id, a.name, a.opening_balance;

-- Add comment explaining the view
COMMENT ON VIEW account_actual_balances IS 'Calculates actual account balances using only completed transactions. Planned transactions are excluded to ensure accurate current balance reporting.';
