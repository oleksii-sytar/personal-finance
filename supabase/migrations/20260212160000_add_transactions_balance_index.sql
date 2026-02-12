-- Migration: Add index for balance calculation performance
-- Feature: Real-Time Balance Reconciliation
-- Task: 2.3 Create indexes for balance calculation performance

BEGIN;

-- Index for fast transaction aggregation by account
-- This index optimizes the balance calculation query that sums transactions
-- by account_id, filtering out soft-deleted records, and grouping by type
CREATE INDEX idx_transactions_account_balance 
  ON transactions(account_id, deleted_at, type, amount)
  WHERE deleted_at IS NULL;

COMMIT;
