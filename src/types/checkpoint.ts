// Simplified Checkpoint Types for Timeline System
// Based on simplified design without complex workflows

// Simplified checkpoint model with individual balance and gap columns
export interface Checkpoint {
  id: string
  workspace_id: string
  account_id: string
  date: Date
  actual_balance: number
  expected_balance: number  // Calculated at creation
  gap: number              // actual - expected, stored
  created_at: Date
  updated_at: Date
}

// Database row types (for Supabase integration)
export type CheckpointRow = {
  id: string
  workspace_id: string
  account_id: string
  date: string
  actual_balance: number
  expected_balance: number
  gap: number
  created_at: string
  updated_at: string
}

// Simplified checkpoint with timeline info
export interface CheckpointWithPeriodInfo extends Checkpoint {
  transaction_count: number  // Transactions in period
  days_since_previous: number
}