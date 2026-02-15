-- ROLLBACK SCRIPT FOR USER JOURNEY ENHANCEMENT MIGRATIONS
-- Use this script ONLY if you need to rollback the user journey enhancement migrations
-- 
-- WARNING: This will remove the following:
-- - Transaction status field (completed/planned)
-- - Planned transaction functionality
-- - User settings table
-- - Account actual balances view
--
-- BEFORE RUNNING: Verify no planned transactions exist that you want to keep
-- 
-- To execute: Run this SQL in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Verify Current State
-- ============================================================================

-- Check if any planned transactions exist
SELECT COUNT(*) as planned_transaction_count 
FROM transactions 
WHERE status = 'planned';

-- If count > 0, you may want to convert them to completed first:
-- UPDATE transactions SET status = 'completed', completed_at = NOW() WHERE status = 'planned';

-- ============================================================================
-- STEP 2: Drop Migration 3 Changes (Fix Account Balances View)
-- ============================================================================

-- Drop the fixed view
DROP VIEW IF EXISTS account_actual_balances;

COMMENT ON VIEW account_actual_balances IS NULL;

-- ============================================================================
-- STEP 3: Drop Migration 2 Changes (User Settings Table)
-- ============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_user_settings_user_workspace;
DROP INDEX IF EXISTS idx_user_settings_workspace;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;

-- Drop table
DROP TABLE IF EXISTS user_settings CASCADE;

-- ============================================================================
-- STEP 4: Drop Migration 1 Changes (Transaction Status Field)
-- ============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_transactions_status;
DROP INDEX IF EXISTS idx_transactions_status_date;
DROP INDEX IF EXISTS idx_transactions_planned_date;
DROP INDEX IF EXISTS idx_transactions_account_status;

-- Remove column comments
COMMENT ON COLUMN transactions.status IS NULL;
COMMENT ON COLUMN transactions.planned_date IS NULL;
COMMENT ON COLUMN transactions.completed_at IS NULL;

-- Drop columns (this will remove the data in these columns)
ALTER TABLE transactions DROP COLUMN IF EXISTS status;
ALTER TABLE transactions DROP COLUMN IF EXISTS planned_date;
ALTER TABLE transactions DROP COLUMN IF EXISTS completed_at;

-- ============================================================================
-- STEP 5: Verify Rollback Complete
-- ============================================================================

-- Verify columns removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('status', 'planned_date', 'completed_at');
-- Should return 0 rows

-- Verify user_settings table removed
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_settings';
-- Should return 0 rows

-- Verify view removed
SELECT table_name 
FROM information_schema.views 
WHERE table_name = 'account_actual_balances';
-- Should return 0 rows

-- ============================================================================
-- STEP 6: Update Migration History (Optional)
-- ============================================================================

-- If you want to mark these migrations as not applied in Supabase migration history:
-- DELETE FROM supabase_migrations.schema_migrations 
-- WHERE version IN (
--   '20260213000000',
--   '20260213000001', 
--   '20260213000002'
-- );

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- Next steps:
-- 1. Verify application still works
-- 2. Regenerate TypeScript types: npm run db:types
-- 3. Disable feature flags in environment variables
-- 4. Redeploy application
-- 5. Investigate root cause of rollback need
-- 6. Fix issues before re-attempting migration

