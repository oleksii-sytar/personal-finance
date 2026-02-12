# Design Document

## Overview

The Real-Time Balance Reconciliation system extends the existing accounts infrastructure to support continuous balance verification. The design introduces two balance fields per account (opening and current), implements real-time difference calculation, and provides always-visible reconciliation status across the application.

The system operates independently of checkpoint-based reconciliation, offering a simpler, more immediate approach to maintaining accurate records. Users can update current balances ad-hoc and immediately see the impact of transaction entry on reconciliation status.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│  • Total Difference Display (Navigation/Dashboard)          │
│  • Account List with Per-Account Differences                │
│  • Current Balance Update Form                              │
│  • Reconciliation Status Indicators                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server Actions Layer                       │
├─────────────────────────────────────────────────────────────┤
│  • updateCurrentBalance(accountId, newBalance)              │
│  • getReconciliationStatus(workspaceId)                     │
│  • getAccountDifference(accountId)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  • Balance Calculator                                        │
│  • Difference Calculator                                     │
│  • Currency Converter                                        │
│  • Reconciliation Status Aggregator                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
├─────────────────────────────────────────────────────────────┤
│  • Accounts Table (with opening_balance, current_balance)   │
│  • Transactions Table (existing)                            │
│  • Exchange Rates Table (existing)                          │
│  • Balance Update History Table (new)                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Balance Update Flow**:
   - User enters new current balance → Server Action validates → Database updates → UI refreshes with new difference

2. **Transaction Entry Flow**:
   - User creates transaction → Database inserts → Calculated balance updates → Difference recalculates → UI updates

3. **Difference Calculation Flow**:
   - Query opening balance + sum transactions → Calculate difference from current balance → Convert to workspace currency → Aggregate total

## Components and Interfaces

### Database Schema Changes

#### Accounts Table Migration

```sql
-- Add new balance fields to accounts table
ALTER TABLE accounts 
  ADD COLUMN opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN current_balance_updated_at TIMESTAMP WITH TIME ZONE;

-- Migrate existing balance to both fields
UPDATE accounts 
SET opening_balance = balance,
    current_balance = balance,
    current_balance_updated_at = NOW();

-- Drop old balance column after migration
ALTER TABLE accounts DROP COLUMN balance;

-- Add constraint to prevent opening_balance modification
CREATE OR REPLACE FUNCTION prevent_opening_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.opening_balance IS DISTINCT FROM NEW.opening_balance THEN
    RAISE EXCEPTION 'opening_balance cannot be modified after account creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_opening_balance_modification
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_opening_balance_change();
```

#### Balance Update History Table

```sql
CREATE TABLE balance_update_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  old_balance DECIMAL(15,2) NOT NULL,
  new_balance DECIMAL(15,2) NOT NULL,
  difference DECIMAL(15,2) NOT NULL,
  updated_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT balance_update_history_account_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT balance_update_history_workspace_fkey 
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_balance_update_history_account 
  ON balance_update_history(account_id, updated_at DESC);
CREATE INDEX idx_balance_update_history_workspace 
  ON balance_update_history(workspace_id, updated_at DESC);
```

### TypeScript Types

```typescript
// Extended Account type
export interface Account {
  id: string
  workspace_id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment'
  opening_balance: number
  current_balance: number
  current_balance_updated_at: string | null
  currency: string
  created_at: string
  updated_at: string
}

// Calculated balance information
export interface AccountBalance {
  account_id: string
  opening_balance: number
  current_balance: number
  calculated_balance: number
  difference: number
  currency: string
  is_reconciled: boolean
}

// Reconciliation status for workspace
export interface ReconciliationStatus {
  total_difference: number
  total_difference_currency: string
  accounts: AccountBalance[]
  all_reconciled: boolean
  last_update: string | null
}

// Balance update history entry
export interface BalanceUpdateHistory {
  id: string
  account_id: string
  old_balance: number
  new_balance: number
  difference: number
  updated_by: string
  updated_at: string
}
```

### Server Actions

```typescript
// src/actions/balance-reconciliation.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { AccountBalance, ReconciliationStatus } from '@/types'

/**
 * Updates the current balance for an account
 */
export async function updateCurrentBalance(
  accountId: string,
  newBalance: number
): Promise<ActionResult<Account>> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }
  
  // Validate input
  if (typeof newBalance !== 'number' || isNaN(newBalance)) {
    return { error: 'Invalid balance value' }
  }
  
  // Get account to verify ownership and get old balance
  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select('*, workspace:workspaces!inner(owner_id)')
    .eq('id', accountId)
    .single()
    
  if (fetchError || !account) {
    return { error: 'Account not found' }
  }
  
  // Update current balance
  const { data: updated, error: updateError } = await supabase
    .from('accounts')
    .update({
      current_balance: newBalance,
      current_balance_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', accountId)
    .select()
    .single()
    
  if (updateError) {
    return { error: 'Failed to update balance' }
  }
  
  // Record history
  await supabase.from('balance_update_history').insert({
    account_id: accountId,
    workspace_id: account.workspace_id,
    old_balance: account.current_balance,
    new_balance: newBalance,
    difference: newBalance - account.current_balance,
    updated_by: user.id
  })
  
  revalidatePath('/accounts')
  revalidatePath('/dashboard')
  
  return { data: updated }
}

/**
 * Gets reconciliation status for all accounts in workspace
 */
export async function getReconciliationStatus(
  workspaceId: string
): Promise<ActionResult<ReconciliationStatus>> {
  const supabase = await createClient()
  
  // Get all accounts with their transactions
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*, transactions(*)')
    .eq('workspace_id', workspaceId)
    .order('created_at')
    
  if (accountsError) {
    return { error: 'Failed to fetch accounts' }
  }
  
  // Calculate balance for each account
  const accountBalances: AccountBalance[] = accounts.map(account => {
    const calculated = calculateAccountBalance(
      account.opening_balance,
      account.transactions
    )
    const difference = account.current_balance - calculated
    
    return {
      account_id: account.id,
      opening_balance: account.opening_balance,
      current_balance: account.current_balance,
      calculated_balance: calculated,
      difference,
      currency: account.currency,
      is_reconciled: Math.abs(difference) < 0.01 // Account for floating point
    }
  })
  
  // Get workspace currency for total calculation
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('currency')
    .eq('id', workspaceId)
    .single()
    
  const workspaceCurrency = workspace?.currency || 'UAH'
  
  // Convert all differences to workspace currency and sum
  const totalDifference = await calculateTotalDifference(
    accountBalances,
    workspaceCurrency
  )
  
  // Find most recent update
  const lastUpdate = accounts
    .map(a => a.current_balance_updated_at)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null
  
  return {
    data: {
      total_difference: totalDifference,
      total_difference_currency: workspaceCurrency,
      accounts: accountBalances,
      all_reconciled: accountBalances.every(a => a.is_reconciled),
      last_update: lastUpdate
    }
  }
}

/**
 * Gets difference for a specific account
 */
export async function getAccountDifference(
  accountId: string
): Promise<ActionResult<AccountBalance>> {
  const supabase = await createClient()
  
  const { data: account, error } = await supabase
    .from('accounts')
    .select('*, transactions(*)')
    .eq('id', accountId)
    .single()
    
  if (error || !account) {
    return { error: 'Account not found' }
  }
  
  const calculated = calculateAccountBalance(
    account.opening_balance,
    account.transactions
  )
  const difference = account.current_balance - calculated
  
  return {
    data: {
      account_id: account.id,
      opening_balance: account.opening_balance,
      current_balance: account.current_balance,
      calculated_balance: calculated,
      difference,
      currency: account.currency,
      is_reconciled: Math.abs(difference) < 0.01
    }
  }
}
```

### Utility Functions

```typescript
// src/lib/utils/balance-calculator.ts

import type { Transaction } from '@/types'

/**
 * Calculates account balance from opening balance and transactions
 */
export function calculateAccountBalance(
  openingBalance: number,
  transactions: Transaction[]
): number {
  const transactionSum = transactions
    .filter(t => !t.deleted_at) // Exclude soft-deleted
    .reduce((sum, t) => {
      return t.type === 'income' 
        ? sum + t.amount 
        : sum - t.amount
    }, 0)
    
  return openingBalance + transactionSum
}

/**
 * Converts amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount
  }
  
  // Get exchange rate from database
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  
  const { data: rate } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('currency', fromCurrency)
    .eq('date', today)
    .single()
    
  if (!rate) {
    throw new Error(`Exchange rate not found for ${fromCurrency}`)
  }
  
  // Convert to UAH first, then to target currency
  const uahAmount = amount * rate.rate
  
  if (toCurrency === 'UAH') {
    return uahAmount
  }
  
  const { data: targetRate } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('currency', toCurrency)
    .eq('date', today)
    .single()
    
  if (!targetRate) {
    throw new Error(`Exchange rate not found for ${toCurrency}`)
  }
  
  return uahAmount / targetRate.rate
}

/**
 * Calculates total difference across all accounts in workspace currency
 */
export async function calculateTotalDifference(
  accountBalances: AccountBalance[],
  workspaceCurrency: string
): Promise<number> {
  let total = 0
  
  for (const account of accountBalances) {
    try {
      const converted = await convertCurrency(
        account.difference,
        account.currency,
        workspaceCurrency
      )
      total += converted
    } catch (error) {
      console.error(`Failed to convert ${account.currency} to ${workspaceCurrency}`, error)
      // Skip this account if conversion fails
    }
  }
  
  return total
}
```

## Data Models

### Account Entity (Extended)

```typescript
interface Account {
  // Existing fields
  id: string
  workspace_id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment'
  currency: string
  created_at: string
  updated_at: string
  
  // New fields for reconciliation
  opening_balance: number        // Set once at creation, immutable
  current_balance: number         // Updated manually during reconciliation
  current_balance_updated_at: string | null  // Timestamp of last update
}
```

### Balance Update History Entity

```typescript
interface BalanceUpdateHistory {
  id: string
  account_id: string
  workspace_id: string
  old_balance: number
  new_balance: number
  difference: number
  updated_by: string
  updated_at: string
}
```

### Reconciliation Status (Computed)

```typescript
interface ReconciliationStatus {
  total_difference: number                    // Sum of all account differences
  total_difference_currency: string           // Workspace currency
  accounts: AccountBalance[]                  // Per-account breakdown
  all_reconciled: boolean                     // True if all differences = 0
  last_update: string | null                  // Most recent balance update
}

interface AccountBalance {
  account_id: string
  opening_balance: number
  current_balance: number
  calculated_balance: number
  difference: number                          // current - calculated
  currency: string
  is_reconciled: boolean                      // |difference| < 0.01
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following consolidation opportunities:

**Redundancy Analysis:**
- Properties 3.2, 3.3, 3.4 (transaction create/edit/delete triggers recalculation) can be combined into one property about transaction changes triggering balance updates
- Properties 7.1, 7.2, 7.3 (real-time updates on transaction changes) are redundant with 3.2, 3.3, 3.4 - they test the same behavior
- Properties 2.4 and 7.4 (current balance update triggers difference recalculation) are duplicates
- Properties 4.2, 4.3, 4.4 (UI messages based on difference) are examples, not properties - they test specific UI states
- Properties 6.3, 6.4 (reconciled badge vs emphasis) are UI examples, not properties
- Properties 9.1-9.5 are all UI guidance examples, not testable properties
- Properties 11.1, 11.5 are UI element presence examples

**Consolidated Properties:**
1. Opening balance immutability (1.5)
2. Initial balance equality (1.2)
3. Balance calculation formula (3.1)
4. Transaction changes trigger balance recalculation (combines 3.2, 3.3, 3.4, 7.1, 7.2, 7.3)
5. Soft-deleted transactions excluded (3.5)
6. Difference calculation formula (4.1)
7. Current balance update triggers difference recalculation (combines 2.4, 7.4)
8. Total difference aggregation (5.1)
9. Multi-currency conversion (5.2, 8.1)
10. Per-account currency preservation (6.2, 8.3)
11. Exchange rate failure handling (8.2, 12.5)
12. Input validation (12.1, 12.2, 12.3)
13. Balance update history recording (10.1, 10.3)
14. Transaction type suggestion based on difference (11.3)
15. Account pre-selection in transaction form (11.2)

### Correctness Properties

**Property 1: Opening Balance Immutability**
*For any* existing account, attempting to modify the opening_balance field should fail with an error, ensuring opening balance remains a historical anchor point.
**Validates: Requirements 1.5**

**Property 2: Initial Balance Equality**
*For any* newly created account with opening balance X, the current_balance should equal X immediately after creation.
**Validates: Requirements 1.2**

**Property 3: Balance Calculation Formula**
*For any* account with opening balance O and set of transactions T, the calculated balance should equal O + sum(income amounts in T) - sum(expense amounts in T), excluding soft-deleted transactions.
**Validates: Requirements 3.1, 3.5**

**Property 4: Transaction Changes Trigger Balance Recalculation**
*For any* account, when a transaction is created, edited, or deleted, the calculated balance should immediately reflect the change according to the balance calculation formula.
**Validates: Requirements 3.2, 3.3, 3.4, 7.1, 7.2, 7.3**

**Property 5: Difference Calculation Formula**
*For any* account with current balance C and calculated balance B, the reconciliation difference should equal C - B.
**Validates: Requirements 4.1**

**Property 6: Current Balance Update Triggers Difference Recalculation**
*For any* account, when the current_balance is updated to a new value N, the reconciliation difference should immediately recalculate as N - calculated_balance.
**Validates: Requirements 2.4, 7.4**

**Property 7: Total Difference Aggregation**
*For any* workspace with accounts A1, A2, ..., An, the total difference should equal the sum of all individual account differences converted to workspace currency.
**Validates: Requirements 5.1**

**Property 8: Multi-Currency Conversion**
*For any* account with difference D in currency C1, when converting to workspace currency C2, the converted amount should use the current exchange rate for C1 to C2.
**Validates: Requirements 5.2, 8.1**

**Property 9: Per-Account Currency Preservation**
*For any* account with currency C, the displayed per-account difference should always be shown in currency C, never converted.
**Validates: Requirements 6.2, 8.3**

**Property 10: Exchange Rate Failure Handling**
*For any* account where exchange rate conversion fails, the system should display a warning and exclude that account from total difference calculation, while still showing the per-account difference in native currency.
**Validates: Requirements 8.2, 12.5**

**Property 11: Input Validation**
*For any* current balance update attempt, the system should accept any valid numeric value (positive, negative, or zero) and reject non-numeric values with a clear error message.
**Validates: Requirements 12.1, 12.2, 12.3**

**Property 12: Balance Update History Recording**
*For any* current balance update from old value O to new value N, the system should create a history record containing O, N, the difference (N - O), the user ID, and timestamp.
**Validates: Requirements 10.1, 10.3**

**Property 13: Transaction Type Suggestion**
*For any* account with positive difference, the add transaction form should suggest "income" type; for negative difference, it should suggest "expense" type.
**Validates: Requirements 11.3**

**Property 14: Account Pre-Selection**
*For any* account being reconciled, when opening the add transaction form from reconciliation view, the account field should be pre-populated with that account's ID.
**Validates: Requirements 11.2**

**Property 15: Real-Time UI Updates**
*For any* change to account balances or transactions, all difference displays (per-account and total) should update without requiring page refresh.
**Validates: Requirements 7.5**

## Error Handling

### Validation Errors

```typescript
// Input validation for current balance updates
export const currentBalanceSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  newBalance: z.number({
    required_error: 'Balance is required',
    invalid_type_error: 'Balance must be a number'
  })
})

// Error types
export type BalanceUpdateError =
  | 'INVALID_ACCOUNT'
  | 'INVALID_BALANCE'
  | 'UNAUTHORIZED'
  | 'ACCOUNT_NOT_FOUND'
  | 'UPDATE_FAILED'
```

### Exchange Rate Errors

```typescript
// Handle missing exchange rates gracefully
try {
  const converted = await convertCurrency(amount, fromCurrency, toCurrency)
  return converted
} catch (error) {
  console.error(`Exchange rate conversion failed: ${error.message}`)
  return {
    error: 'EXCHANGE_RATE_UNAVAILABLE',
    message: `Unable to convert ${fromCurrency} to ${toCurrency}`,
    fallback: 'Account excluded from total calculation'
  }
}
```

### Calculation Errors

```typescript
// Handle balance calculation failures
try {
  const calculated = calculateAccountBalance(openingBalance, transactions)
  return calculated
} catch (error) {
  console.error(`Balance calculation failed: ${error.message}`)
  // Use last known good value or opening balance as fallback
  return account.last_calculated_balance || account.opening_balance
}
```

### Database Errors

```typescript
// Handle database operation failures
const { data, error } = await supabase
  .from('accounts')
  .update({ current_balance: newBalance })
  .eq('id', accountId)
  .select()
  .single()

if (error) {
  if (error.code === '23514') {
    // Check constraint violation (e.g., opening_balance modification)
    return { error: 'IMMUTABLE_FIELD', message: 'Opening balance cannot be modified' }
  }
  return { error: 'UPDATE_FAILED', message: 'Failed to update account balance' }
}
```

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific scenarios with property-based tests for comprehensive coverage:

**Unit Tests:**
- Specific balance calculation examples (opening balance + transactions)
- Edge cases: zero balances, negative balances, empty transaction lists
- Error conditions: invalid inputs, missing exchange rates, database failures
- UI component rendering: difference displays, reconciliation status indicators
- Integration: transaction creation → balance update → difference recalculation

**Property-Based Tests:**
- Balance calculation formula holds for all transaction combinations
- Difference calculation formula holds for all balance values
- Currency conversion maintains mathematical relationships
- Real-time updates propagate correctly for all change types
- Immutability constraints enforced for all update attempts

**Property Test Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: **Feature: realtime-balance-reconciliation, Property N: [property text]**
- Use fast-check or similar library for TypeScript property testing

### Test Coverage Requirements

- Balance calculation utilities: 90%
- Currency conversion utilities: 90%
- Server actions: 80%
- React components: 70%
- Overall: 75%

### Example Property Test

```typescript
// Property 3: Balance Calculation Formula
import fc from 'fast-check'

describe('Balance Calculation', () => {
  it('Property 3: calculated balance equals opening + income - expenses', () => {
    /**
     * Feature: realtime-balance-reconciliation
     * Property 3: Balance Calculation Formula
     */
    fc.assert(
      fc.property(
        fc.float({ min: -10000, max: 10000 }), // opening balance
        fc.array(fc.record({
          amount: fc.float({ min: 0, max: 1000 }),
          type: fc.constantFrom('income', 'expense'),
          deleted_at: fc.option(fc.date(), { nil: null })
        })), // transactions
        (openingBalance, transactions) => {
          const calculated = calculateAccountBalance(openingBalance, transactions)
          
          const expected = transactions
            .filter(t => !t.deleted_at)
            .reduce((sum, t) => {
              return t.type === 'income' ? sum + t.amount : sum - t.amount
            }, openingBalance)
          
          expect(calculated).toBeCloseTo(expected, 2)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Integration Test Scenarios

1. **Complete Reconciliation Flow:**
   - Create account with opening balance
   - Add transactions
   - Verify calculated balance updates
   - Update current balance
   - Verify difference calculation
   - Add missing transactions until difference = 0
   - Verify reconciliation complete

2. **Multi-Account Reconciliation:**
   - Create multiple accounts in different currencies
   - Add transactions to each
   - Update current balances
   - Verify total difference aggregation
   - Verify currency conversion

3. **Real-Time Updates:**
   - Open reconciliation view
   - Add/edit/delete transactions in another tab
   - Verify differences update without refresh

4. **Error Handling:**
   - Attempt to modify opening balance (should fail)
   - Update current balance with invalid input (should reject)
   - Test with missing exchange rates (should warn and exclude)

## Performance Considerations

### Database Optimization

```sql
-- Index for fast transaction aggregation by account
CREATE INDEX idx_transactions_account_balance 
  ON transactions(account_id, deleted_at, type, amount)
  WHERE deleted_at IS NULL;

-- Index for balance update history queries
CREATE INDEX idx_balance_history_account_date 
  ON balance_update_history(account_id, updated_at DESC);

-- Index for exchange rate lookups
CREATE INDEX idx_exchange_rates_currency_date 
  ON exchange_rates(currency, date DESC);
```

### Caching Strategy

```typescript
// Cache calculated balances for 5 minutes
const BALANCE_CACHE_TTL = 5 * 60 * 1000

const balanceCache = new Map<string, {
  balance: number
  timestamp: number
}>()

export function getCachedBalance(accountId: string): number | null {
  const cached = balanceCache.get(accountId)
  if (!cached) return null
  
  const age = Date.now() - cached.timestamp
  if (age > BALANCE_CACHE_TTL) {
    balanceCache.delete(accountId)
    return null
  }
  
  return cached.balance
}

export function setCachedBalance(accountId: string, balance: number): void {
  balanceCache.set(accountId, {
    balance,
    timestamp: Date.now()
  })
}
```

### Real-Time Update Optimization

```typescript
// Debounce difference calculations to avoid excessive updates
import { debounce } from 'lodash'

const debouncedRecalculate = debounce(
  async (accountId: string) => {
    const difference = await getAccountDifference(accountId)
    updateUI(difference)
  },
  300 // Wait 300ms after last change
)

// Use React Query for automatic cache invalidation
export function useReconciliationStatus(workspaceId: string) {
  return useQuery({
    queryKey: ['reconciliation-status', workspaceId],
    queryFn: () => getReconciliationStatus(workspaceId),
    staleTime: 30000, // Consider fresh for 30 seconds
    refetchOnWindowFocus: true
  })
}
```

## Migration Strategy

### Data Migration

```sql
-- Migration: Add reconciliation fields to accounts
-- File: supabase/migrations/YYYYMMDD_add_reconciliation_fields.sql

BEGIN;

-- Add new columns
ALTER TABLE accounts 
  ADD COLUMN opening_balance DECIMAL(15,2),
  ADD COLUMN current_balance DECIMAL(15,2),
  ADD COLUMN current_balance_updated_at TIMESTAMP WITH TIME ZONE;

-- Migrate existing balance to both fields
UPDATE accounts 
SET opening_balance = balance,
    current_balance = balance,
    current_balance_updated_at = NOW()
WHERE opening_balance IS NULL;

-- Make columns NOT NULL after migration
ALTER TABLE accounts 
  ALTER COLUMN opening_balance SET NOT NULL,
  ALTER COLUMN current_balance SET NOT NULL;

-- Drop old balance column
ALTER TABLE accounts DROP COLUMN balance;

-- Add immutability constraint
CREATE OR REPLACE FUNCTION prevent_opening_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.opening_balance IS DISTINCT FROM NEW.opening_balance THEN
    RAISE EXCEPTION 'opening_balance cannot be modified after account creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_opening_balance_modification
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_opening_balance_change();

-- Create balance update history table
CREATE TABLE balance_update_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  old_balance DECIMAL(15,2) NOT NULL,
  new_balance DECIMAL(15,2) NOT NULL,
  difference DECIMAL(15,2) NOT NULL,
  updated_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_balance_update_history_account 
  ON balance_update_history(account_id, updated_at DESC);
CREATE INDEX idx_balance_update_history_workspace 
  ON balance_update_history(workspace_id, updated_at DESC);

COMMIT;
```

### Rollback Plan

```sql
-- Rollback: Remove reconciliation fields
-- File: supabase/migrations/YYYYMMDD_rollback_reconciliation_fields.sql

BEGIN;

-- Drop trigger and function
DROP TRIGGER IF EXISTS prevent_opening_balance_modification ON accounts;
DROP FUNCTION IF EXISTS prevent_opening_balance_change();

-- Drop history table
DROP TABLE IF EXISTS balance_update_history;

-- Add back old balance column
ALTER TABLE accounts ADD COLUMN balance DECIMAL(15,2);

-- Migrate current_balance back to balance
UPDATE accounts SET balance = current_balance;

-- Make balance NOT NULL
ALTER TABLE accounts ALTER COLUMN balance SET NOT NULL;

-- Drop new columns
ALTER TABLE accounts 
  DROP COLUMN opening_balance,
  DROP COLUMN current_balance,
  DROP COLUMN current_balance_updated_at;

COMMIT;
```

## UI/UX Considerations

### Total Difference Display

```tsx
// Prominent display in navigation
<nav className="flex items-center justify-between">
  <div className="flex items-center gap-4">
    {/* Navigation items */}
  </div>
  
  <ReconciliationBadge 
    totalDifference={totalDifference}
    currency={workspaceCurrency}
    isReconciled={allReconciled}
  />
</nav>

// ReconciliationBadge component
function ReconciliationBadge({ totalDifference, currency, isReconciled }) {
  if (isReconciled) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-accent-success/10 rounded-full">
        <CheckCircle className="w-5 h-5 text-accent-success" />
        <span className="text-sm font-medium text-accent-success">
          All Reconciled
        </span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-accent-warning/10 rounded-full">
      <AlertCircle className="w-5 h-5 text-accent-warning" />
      <span className="text-sm font-medium text-text-primary">
        Difference: {formatCurrency(totalDifference, currency)}
      </span>
    </div>
  )
}
```

### Account List with Differences

```tsx
// Account list item showing reconciliation status
function AccountListItem({ account, difference }) {
  return (
    <div className="glass-card p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AccountTypeIcon type={account.type} />
        <div>
          <h3 className="font-semibold text-text-primary">{account.name}</h3>
          <p className="text-sm text-text-secondary">
            {formatCurrency(account.current_balance, account.currency)}
          </p>
        </div>
      </div>
      
      <ReconciliationStatus 
        difference={difference}
        currency={account.currency}
      />
    </div>
  )
}

function ReconciliationStatus({ difference, currency }) {
  if (Math.abs(difference) < 0.01) {
    return (
      <div className="flex items-center gap-2 text-accent-success">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Reconciled</span>
      </div>
    )
  }
  
  return (
    <div className="text-right">
      <p className="text-sm text-text-secondary">Difference</p>
      <p className={`font-semibold ${
        difference > 0 ? 'text-accent-success' : 'text-accent-error'
      }`}>
        {difference > 0 ? '+' : ''}{formatCurrency(difference, currency)}
      </p>
    </div>
  )
}
```

### Current Balance Update Form

```tsx
function UpdateBalanceDialog({ account, onClose }) {
  const [newBalance, setNewBalance] = useState(account.current_balance)
  const { data: accountBalance } = useAccountDifference(account.id)
  
  const handleSubmit = async () => {
    const result = await updateCurrentBalance(account.id, newBalance)
    if (result.data) {
      toast.success('Balance updated successfully')
      onClose()
    } else {
      toast.error(result.error)
    }
  }
  
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Update Current Balance</DialogTitle>
      <DialogContent>
        <div className="space-y-4">
          <div className="bg-glass p-4 rounded-xl">
            <p className="text-sm text-text-secondary">Calculated Balance</p>
            <p className="text-2xl font-bold text-text-primary">
              {formatCurrency(accountBalance?.calculated_balance, account.currency)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Based on opening balance + transactions
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-text-primary">
              Current Balance (from bank)
            </label>
            <input
              type="number"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(parseFloat(e.target.value))}
              className="form-input w-full mt-1"
            />
          </div>
          
          {newBalance !== account.current_balance && (
            <div className="bg-accent-warning/10 p-3 rounded-lg">
              <p className="text-sm text-text-primary">
                New difference: {formatCurrency(
                  newBalance - accountBalance?.calculated_balance,
                  account.currency
                )}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Update Balance</Button>
      </DialogActions>
    </Dialog>
  )
}
```

## Security Considerations

### Row Level Security (RLS)

```sql
-- RLS policy for balance_update_history
CREATE POLICY "Users can view balance history for their workspace accounts"
  ON balance_update_history
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert balance history for their workspace accounts"
  ON balance_update_history
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Ensure opening_balance cannot be modified via RLS
-- (Already enforced by trigger, but defense in depth)
```

### Audit Trail

All balance updates are automatically logged in `balance_update_history` with:
- User ID who made the change
- Timestamp of change
- Old and new values
- Calculated difference

This provides complete audit trail for compliance and debugging.

## Future Enhancements

### Phase 2 Features (Out of Scope for v1)

1. **Scheduled Reconciliation Reminders**
   - Email/push notifications when reconciliation is overdue
   - Configurable reminder frequency per workspace

2. **Reconciliation Analytics**
   - Average time to reconcile
   - Most common difference patterns
   - Accuracy trends over time

3. **Bulk Balance Updates**
   - Update multiple account balances at once
   - Import balances from CSV/spreadsheet

4. **Reconciliation Templates**
   - Save common reconciliation workflows
   - Quick-apply templates for recurring patterns

5. **Integration with Checkpoint System**
   - Optionally create checkpoint when all accounts reconciled
   - Link reconciliation history to checkpoint history

## Dependencies

### External Dependencies
- Supabase (database, auth)
- Next.js (framework)
- React Query (data fetching, caching)
- Zod (validation)
- date-fns (date manipulation)
- fast-check (property-based testing)

### Internal Dependencies
- Existing accounts system
- Existing transactions system
- Exchange rates system
- Currency conversion utilities
- Authentication system

## Deployment Considerations

### Database Migration
- Migration can be applied to production without downtime
- Existing `balance` field migrated to both `opening_balance` and `current_balance`
- Rollback plan available if issues arise

### Feature Flag
```typescript
// Feature flag for gradual rollout
export const FEATURE_FLAGS = {
  REALTIME_RECONCILIATION: process.env.NEXT_PUBLIC_FEATURE_REALTIME_RECONCILIATION === 'true'
}
```

### Monitoring
- Track balance update frequency
- Monitor calculation performance
- Alert on exchange rate conversion failures
- Track reconciliation completion rates


## Checkpoint System Removal

### Rationale

The real-time balance reconciliation system replaces the checkpoint-based reconciliation approach. The checkpoint system was designed for periodic reconciliation with formal period closure, while the new system provides continuous, ad-hoc reconciliation that better matches user workflow.

### Components to Remove

#### Database Tables
```sql
-- Tables to drop
DROP TABLE IF EXISTS reconciliation_sessions CASCADE;
DROP TABLE IF EXISTS reconciliation_periods CASCADE;
DROP TABLE IF EXISTS checkpoints CASCADE;
```

#### Database Functions
```sql
-- Functions to remove (if any checkpoint-specific functions exist)
-- Check for functions related to checkpoint creation, period closure, etc.
```

#### TypeScript Types
```typescript
// Remove from src/types/index.ts or database.ts
- Checkpoint interface
- ReconciliationPeriod interface
- ReconciliationSession interface
```

#### Server Actions
```typescript
// Files to remove or refactor
- src/actions/checkpoints.ts (remove entirely)
- src/actions/reconciliation.ts (remove checkpoint-related functions)
```

#### React Components
```typescript
// Components to remove
- src/components/checkpoints/* (entire directory)
- src/components/reconciliation/* (checkpoint-specific components)
```

#### Pages/Routes
```typescript
// Routes to remove
- src/app/(dashboard)/checkpoints/* (entire route)
- Any checkpoint-related API routes
```

### Migration Strategy for Existing Checkpoint Data

#### Option 1: Archive Checkpoint Data (Recommended)
```sql
-- Create archive tables before dropping
CREATE TABLE checkpoints_archive AS SELECT * FROM checkpoints;
CREATE TABLE reconciliation_periods_archive AS SELECT * FROM reconciliation_periods;
CREATE TABLE reconciliation_sessions_archive AS SELECT * FROM reconciliation_sessions;

-- Then drop the active tables
DROP TABLE reconciliation_sessions CASCADE;
DROP TABLE reconciliation_periods CASCADE;
DROP TABLE checkpoints CASCADE;
```

#### Option 2: Convert Last Checkpoint to Current Balance
```sql
-- Before dropping checkpoints, migrate last checkpoint balance to current_balance
WITH latest_checkpoints AS (
  SELECT DISTINCT ON (account_id)
    account_id,
    actual_balance
  FROM checkpoints
  WHERE account_id IS NOT NULL
  ORDER BY account_id, created_at DESC
)
UPDATE accounts a
SET current_balance = lc.actual_balance,
    current_balance_updated_at = NOW()
FROM latest_checkpoints lc
WHERE a.id = lc.account_id;
```

### Removal Checklist

- [ ] Archive checkpoint data (if needed for historical reference)
- [ ] Migrate last checkpoint balances to current_balance (optional)
- [ ] Drop database tables (checkpoints, reconciliation_periods, reconciliation_sessions)
- [ ] Remove checkpoint-related database functions
- [ ] Remove checkpoint TypeScript types
- [ ] Remove checkpoint server actions
- [ ] Remove checkpoint React components
- [ ] Remove checkpoint routes/pages
- [ ] Update navigation to remove checkpoint links
- [ ] Remove checkpoint-related tests
- [ ] Update documentation to remove checkpoint references
- [ ] Search codebase for "checkpoint" references and clean up

### Code Search Patterns

```bash
# Find all checkpoint references
grep -r "checkpoint" src/
grep -r "Checkpoint" src/
grep -r "reconciliation_period" src/
grep -r "ReconciliationPeriod" src/

# Find all checkpoint imports
grep -r "from.*checkpoint" src/
grep -r "import.*checkpoint" src/
```

### Breaking Changes

This is a breaking change that removes existing functionality. Users who have created checkpoints will lose access to that historical data unless it's archived. Consider:

1. **Communication**: Notify users before deployment that checkpoint system is being replaced
2. **Data Export**: Provide a way for users to export their checkpoint history before migration
3. **Gradual Migration**: Consider a transition period where both systems coexist (not recommended due to complexity)

### Recommended Approach

**Single-Step Migration:**
1. Archive checkpoint data to separate tables
2. Migrate last checkpoint balance to current_balance for each account
3. Drop checkpoint tables
4. Remove all checkpoint-related code
5. Deploy new real-time reconciliation system

This provides a clean break while preserving historical data for reference if needed.
