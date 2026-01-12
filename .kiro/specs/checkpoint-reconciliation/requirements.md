# Requirements Document

## Introduction

The Checkpoint Reconciliation system is a core differentiator of Forma that enables users to maintain financial discipline through periodic balance verification. Unlike traditional expense tracking that relies on continuous monitoring, Forma uses a checkpoint-based approach where users periodically record their actual account balances and reconcile them against expected balances calculated from transaction records.

This system transforms financial management from a reactive process (discovering discrepancies after the fact) into a proactive discipline (regular verification and correction). The reconciliation workflow ensures users maintain accurate records and provides the foundation for Forma's pattern learning and forecasting capabilities.

## Glossary

- **Checkpoint**: A point-in-time record of actual account balances entered by the user
- **Expected_Balance**: The calculated balance based on the previous checkpoint plus all transactions since then
- **Actual_Balance**: The real balance as reported by the user from their bank/account statements
- **Reconciliation_Gap**: The difference between expected and actual balances (Actual - Expected)
- **Reconciliation_Period**: The time span between two checkpoints
- **Pattern_Learning**: The algorithm that analyzes closed reconciliation periods to predict future spending patterns
- **Quick_Close**: A feature that automatically creates adjustment transactions to resolve reconciliation gaps
- **Workspace_Owner**: The user with administrative privileges who receives reconciliation reminders

## Requirements

### Requirement 1: Checkpoint Creation

**User Story:** As a user, I want to create a financial checkpoint, so that I can record my actual balances at a point in time and begin the reconciliation process.

#### Acceptance Criteria

1. WHEN a user accesses the Transactions section, THE System SHALL provide a prominent "Create Checkpoint" action
2. WHEN creating a checkpoint, THE System SHALL prompt the user to enter current actual balance for each tracked account
3. WHEN a checkpoint is created, THE System SHALL automatically record the current date and time
4. WHEN a checkpoint is created, THE System SHALL calculate the expected balance using the formula: previous checkpoint balance + sum of all transactions since previous checkpoint
5. WHEN expected and actual balances differ, THE System SHALL clearly display the difference amount and percentage
6. WHEN a checkpoint is saved, THE System SHALL store it in the checkpoint history and make it visible to the user

### Requirement 2: Reconciliation Status Visibility

**User Story:** As a user, I want to see my reconciliation status, so that I know if my records match reality and when I need to perform reconciliation.

#### Acceptance Criteria

1. WHEN viewing reconciliation status, THE System SHALL display the last checkpoint date, expected balance, and gap amount
2. WHEN displaying the reconciliation gap, THE System SHALL show both the absolute amount and percentage of period transactions
3. WHEN the gap is less than 2% of period transactions, THE System SHALL display a green visual indicator
4. WHEN the gap is between 2% and 5% of period transactions, THE System SHALL display a yellow visual indicator  
5. WHEN the gap is greater than 5% of period transactions, THE System SHALL display a red visual indicator
6. WHEN displaying reconciliation status, THE System SHALL show the number of days since the last checkpoint

### Requirement 3: Reconciliation Gap Resolution

**User Story:** As a user, I want to resolve the gap between expected and actual balances, so that I can close the reconciliation period cleanly and maintain accurate records.

#### Acceptance Criteria

1. WHEN resolving a reconciliation gap, THE System SHALL allow the user to review all transactions in the current period to identify discrepancies
2. WHEN reviewing transactions for gap resolution, THE System SHALL allow the user to add missing transactions discovered during the review process
3. WHEN the user chooses "Quick Close" option, THE System SHALL create an "Other" category adjustment transaction to resolve the gap
4. WHEN the reconciliation gap is negative (actual < expected), THE System SHALL create an "Other Expense" transaction for the gap amount
5. WHEN the reconciliation gap is positive (actual > expected), THE System SHALL create an "Other Income" transaction for the gap amount
6. WHEN gap resolution is complete, THE System SHALL display the gap as zero and enable period closure

### Requirement 4: Reconciliation Period Closure

**User Story:** As a user, I want to close a reconciliation period, so that I can finalize my records and trigger the system's pattern learning capabilities.

#### Acceptance Criteria

1. WHEN attempting to close a reconciliation period, THE System SHALL only allow closure when the reconciliation gap is zero
2. WHEN a reconciliation period is closed, THE System SHALL lock all transactions in that period from editing unless explicitly unlocked by the user
3. WHEN a reconciliation period is closed, THE System SHALL trigger the pattern learning algorithm to analyze spending patterns
4. WHEN closing a reconciliation period, THE System SHALL require user confirmation before proceeding with the closure
5. WHEN a reconciliation period is closed, THE System SHALL add it to the reconciliation history with a summary of the period's financial activity

### Requirement 5: Reconciliation Reminder System

**User Story:** As a Workspace Owner, I want to receive reminders when reconciliation is overdue, so that I maintain financial discipline and keep my records current.

#### Acceptance Criteria

1. WHEN tracking reconciliation timing, THE System SHALL continuously monitor the number of days since the last checkpoint
2. WHEN 7 days have passed without reconciliation, THE System SHALL display a warning notification to the Workspace Owner
3. WHEN 14 days have passed without reconciliation, THE System SHALL display an urgent notification to the Workspace Owner
4. WHEN sending reconciliation reminders, THE System SHALL only notify the Workspace Owner, not other workspace members
5. WHEN displaying reconciliation notifications, THE System SHALL make them visible on the Dashboard for immediate user awareness

### Requirement 6: Reconciliation History and Audit Trail

**User Story:** As a user, I want to view my reconciliation history, so that I can track my financial discipline over time and review past reconciliation decisions.

#### Acceptance Criteria

1. WHEN viewing reconciliation history, THE System SHALL display all completed checkpoints in chronological order
2. WHEN displaying checkpoint history, THE System SHALL show the checkpoint date, actual balance, expected balance, gap amount, and resolution method
3. WHEN a reconciliation period was closed with adjustments, THE System SHALL clearly indicate the adjustment transactions created
4. WHEN viewing historical reconciliation data, THE System SHALL allow users to drill down into the transactions that comprised each period
5. WHEN displaying reconciliation metrics, THE System SHALL show trends such as average gap size, reconciliation frequency, and accuracy improvements over time

### Requirement 7: Multi-Account Reconciliation Support

**User Story:** As a user with multiple accounts, I want to reconcile each account separately, so that I can maintain accurate records across all my financial accounts.

#### Acceptance Criteria

1. WHEN creating a checkpoint, THE System SHALL allow the user to enter actual balances for each tracked account separately
2. WHEN calculating expected balances, THE System SHALL compute expected balance per account based on account-specific transactions
3. WHEN displaying reconciliation gaps, THE System SHALL show gaps per account and a total consolidated gap
4. WHEN resolving gaps, THE System SHALL allow users to resolve each account's gap independently
5. WHEN closing a reconciliation period, THE System SHALL require all account gaps to be resolved to zero before allowing closure