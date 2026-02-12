# Requirements Document

## Introduction

The Real-Time Balance Reconciliation system enables users to maintain accurate financial records by continuously tracking the difference between actual account balances (as reported by banks) and calculated balances (derived from entered transactions). Unlike checkpoint-based reconciliation which operates on scheduled periods, this system provides immediate, always-visible feedback that guides users to enter missing transactions until their records match reality.

This approach transforms reconciliation from a periodic task into a continuous discipline, making it easier for users to maintain accurate records without waiting for formal checkpoint creation. The real-time difference display acts as a constant reminder and motivator to keep records current.

## Glossary

- **Account**: A financial account (checking, savings, credit card, investment) that holds money
- **Opening_Balance**: The historical starting balance set once when creating an account
- **Current_Balance**: The actual balance as reported by the bank, manually updated by the user during reconciliation
- **Calculated_Balance**: The balance computed from opening_balance + sum of all transactions for the account
- **Reconciliation_Difference**: The gap between current_balance and calculated_balance (current - calculated)
- **Total_Difference**: The sum of reconciliation differences across all accounts in workspace currency
- **Workspace_Currency**: The default currency for the workspace used for multi-account totals
- **Balance_Reconciliation**: The process of updating current balances and entering missing transactions until difference = 0

## Requirements

### Requirement 1: Account Balance Fields

**User Story:** As a user, I want accounts to track both opening and current balances, so that I can reconcile against real bank balances without losing historical context.

#### Acceptance Criteria

1. WHEN creating an account, THE System SHALL require the user to enter an opening balance
2. WHEN creating an account, THE System SHALL initialize the current balance to equal the opening balance
3. WHEN storing account balances, THE System SHALL maintain both opening_balance and current_balance as separate fields
4. WHEN displaying account details, THE System SHALL show both opening balance (historical) and current balance (target for reconciliation)
5. THE System SHALL NOT allow editing the opening balance after account creation (it is a historical anchor point)

### Requirement 2: Current Balance Updates

**User Story:** As a user, I want to update the current balance on any account at any time, so that I can reconcile whenever I check my bank statements.

#### Acceptance Criteria

1. WHEN viewing an account, THE System SHALL provide an "Update Current Balance" action
2. WHEN updating current balance, THE System SHALL display the current calculated balance as reference
3. WHEN updating current balance, THE System SHALL accept any valid numeric value (positive or negative)
4. WHEN current balance is updated, THE System SHALL immediately recalculate the reconciliation difference
5. WHEN current balance is updated, THE System SHALL record the update timestamp for audit purposes

### Requirement 3: Calculated Balance Computation

**User Story:** As a user, I want the system to automatically calculate my balance from transactions, so that I can see if my records match reality.

#### Acceptance Criteria

1. WHEN calculating account balance, THE System SHALL use the formula: opening_balance + sum(income transactions) - sum(expense transactions)
2. WHEN a new transaction is added to an account, THE System SHALL immediately recalculate the calculated balance
3. WHEN a transaction is edited, THE System SHALL immediately recalculate the affected account's calculated balance
4. WHEN a transaction is deleted, THE System SHALL immediately recalculate the affected account's calculated balance
5. WHEN calculating balance, THE System SHALL include all non-deleted transactions for the account regardless of date

### Requirement 4: Reconciliation Difference Display

**User Story:** As a user, I want to see the difference between my current and calculated balances, so that I know how many transactions I'm missing.

#### Acceptance Criteria

1. WHEN displaying reconciliation difference, THE System SHALL calculate it as: current_balance - calculated_balance
2. WHEN the difference is positive, THE System SHALL indicate missing income transactions or extra expenses entered
3. WHEN the difference is negative, THE System SHALL indicate missing expense transactions or extra income entered
4. WHEN the difference is zero, THE System SHALL display a clear "Reconciled" indicator
5. WHEN displaying the difference, THE System SHALL show both the absolute amount and the account currency

### Requirement 5: Total Difference Across All Accounts

**User Story:** As a user with multiple accounts, I want to see the total difference across all my accounts, so that I know my overall reconciliation status at a glance.

#### Acceptance Criteria

1. WHEN calculating total difference, THE System SHALL sum reconciliation differences from all accounts
2. WHEN accounts use different currencies, THE System SHALL convert all differences to workspace currency using current exchange rates
3. WHEN displaying total difference, THE System SHALL show it prominently in the main navigation or dashboard
4. WHEN total difference is zero, THE System SHALL display a success indicator showing all accounts are reconciled
5. WHEN total difference is non-zero, THE System SHALL display the amount with appropriate visual emphasis

### Requirement 6: Per-Account Difference Breakdown

**User Story:** As a user, I want to see which specific accounts have reconciliation differences, so that I can focus on entering missing transactions for those accounts.

#### Acceptance Criteria

1. WHEN viewing the accounts list, THE System SHALL display the reconciliation difference for each account
2. WHEN displaying per-account differences, THE System SHALL show the difference amount in the account's currency
3. WHEN an account has zero difference, THE System SHALL display a "Reconciled" badge or checkmark
4. WHEN an account has non-zero difference, THE System SHALL display the difference amount with visual emphasis
5. WHEN viewing account details, THE System SHALL show the breakdown: opening balance, calculated balance, current balance, and difference

### Requirement 7: Real-Time Difference Updates

**User Story:** As a user entering transactions, I want to see the reconciliation difference update immediately, so that I know when I've entered all missing transactions.

#### Acceptance Criteria

1. WHEN a transaction is created, THE System SHALL immediately update the calculated balance and reconciliation difference
2. WHEN a transaction is edited, THE System SHALL immediately update the calculated balance and reconciliation difference
3. WHEN a transaction is deleted, THE System SHALL immediately update the calculated balance and reconciliation difference
4. WHEN current balance is updated, THE System SHALL immediately recalculate the reconciliation difference
5. WHEN differences update, THE System SHALL reflect changes in both per-account and total difference displays without page refresh

### Requirement 8: Multi-Currency Support

**User Story:** As a user with accounts in different currencies, I want to see accurate total differences, so that I can reconcile across all my accounts regardless of currency.

#### Acceptance Criteria

1. WHEN calculating total difference, THE System SHALL convert each account's difference to workspace currency
2. WHEN exchange rates are unavailable, THE System SHALL display a warning and exclude that account from total calculation
3. WHEN displaying per-account differences, THE System SHALL always show amounts in the account's native currency
4. WHEN displaying total difference, THE System SHALL always show the amount in workspace currency
5. WHEN exchange rates are updated, THE System SHALL recalculate total difference using the new rates

### Requirement 9: Reconciliation Workflow Guidance

**User Story:** As a user, I want guidance on how to reconcile my accounts, so that I understand what actions to take when differences exist.

#### Acceptance Criteria

1. WHEN a reconciliation difference exists, THE System SHALL provide contextual help explaining what the difference means
2. WHEN the difference is positive, THE System SHALL suggest checking for missing income transactions or incorrectly entered expenses
3. WHEN the difference is negative, THE System SHALL suggest checking for missing expense transactions or incorrectly entered income
4. WHEN viewing an account with difference, THE System SHALL provide quick access to add transactions for that account
5. WHEN difference reaches zero, THE System SHALL display a success message confirming reconciliation is complete

### Requirement 10: Reconciliation History Tracking

**User Story:** As a user, I want to track when I update current balances, so that I can see my reconciliation discipline over time.

#### Acceptance Criteria

1. WHEN current balance is updated, THE System SHALL record the update timestamp
2. WHEN viewing account history, THE System SHALL show all current balance updates with dates
3. WHEN displaying balance update history, THE System SHALL show the old value, new value, and difference
4. WHEN viewing reconciliation history, THE System SHALL show how long each reconciliation took (time between updates)
5. WHEN displaying history, THE System SHALL allow filtering by account and date range

### Requirement 11: Integration with Transaction Entry

**User Story:** As a user reconciling accounts, I want seamless access to transaction entry, so that I can quickly add missing transactions without navigation overhead.

#### Acceptance Criteria

1. WHEN viewing reconciliation differences, THE System SHALL provide a quick "Add Transaction" action
2. WHEN adding a transaction from reconciliation view, THE System SHALL pre-select the account being reconciled
3. WHEN adding a transaction from reconciliation view, THE System SHALL suggest the transaction type (income/expense) based on difference direction
4. WHEN a transaction is added, THE System SHALL immediately show the updated difference
5. WHEN difference reaches zero after adding transactions, THE System SHALL provide visual confirmation

### Requirement 12: Validation and Error Handling

**User Story:** As a user, I want the system to validate my balance updates, so that I don't enter invalid data that breaks reconciliation.

#### Acceptance Criteria

1. WHEN updating current balance, THE System SHALL validate that the value is a valid number
2. WHEN updating current balance, THE System SHALL allow negative values (for credit accounts or overdrafts)
3. WHEN current balance update fails validation, THE System SHALL display a clear error message
4. WHEN calculated balance computation fails, THE System SHALL display an error and use the last known good value
5. WHEN exchange rate conversion fails, THE System SHALL display a warning and exclude the account from total difference
