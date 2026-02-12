# Requirements Document

## Introduction

The Accounts Management system is a foundational feature of Forma that enables users to organize their finances across multiple financial accounts (checking, savings, credit cards, investments). Unlike traditional finance apps that focus solely on transactions, Forma recognizes that families manage money across multiple accounts, and each account needs to be tracked separately for accurate reconciliation and balance management.

This system provides the infrastructure for checkpoint-based reconciliation, where users verify actual account balances against expected balances calculated from transaction history. Without proper account management, users cannot create checkpoints or maintain the financial discipline that Forma is designed to enable.

## Glossary

- **Account**: A financial account (checking, savings, credit card, investment) that holds money and has transactions
- **Account Type**: The category of account (checking, savings, credit, investment) that determines its behavior
- **Default Account**: The first account created in a workspace, used when no specific account is selected
- **Account Balance**: The current balance of an account, updated through transactions and checkpoints
- **Multi-Account Workspace**: A workspace with multiple accounts that need separate tracking and reconciliation
- **Account Deletion**: Removing an account from the workspace (only allowed if no transactions exist)

## Requirements

### Requirement 1: Account Creation

**User Story:** As a user, I want to create financial accounts, so that I can organize my money across different accounts (checking, savings, credit cards, etc.).

#### Acceptance Criteria

1. WHEN a user accesses the Accounts section, THE System SHALL provide a prominent "Add Account" action
2. WHEN creating an account, THE System SHALL require the user to enter an account name (max 100 characters)
3. WHEN creating an account, THE System SHALL require the user to select an account type from: checking, savings, credit, investment
4. WHEN creating an account, THE System SHALL allow the user to optionally enter an initial balance (defaults to 0)
5. WHEN creating an account, THE System SHALL use the workspace's default currency for the account
6. WHEN an account is created, THE System SHALL automatically record the creation timestamp
7. WHEN the first account is created in a workspace, THE System SHALL mark it as the default account for transactions

### Requirement 2: Account List Display

**User Story:** As a user, I want to view all my accounts, so that I can see my financial accounts at a glance and understand my overall financial position.

#### Acceptance Criteria

1. WHEN viewing the accounts list, THE System SHALL display all accounts for the current workspace
2. WHEN displaying an account, THE System SHALL show the account name, type, current balance, and currency
3. WHEN displaying account balances, THE System SHALL format them according to the account's currency
4. WHEN displaying the accounts list, THE System SHALL show accounts in chronological order (oldest first)
5. WHEN the accounts list is empty, THE System SHALL display a helpful empty state prompting the user to create their first account
6. WHEN displaying account types, THE System SHALL use clear, user-friendly labels (e.g., "Checking Account", "Savings Account")

### Requirement 3: Account Editing

**User Story:** As a user, I want to edit my account details, so that I can correct mistakes or update account information as my financial situation changes.

#### Acceptance Criteria

1. WHEN viewing an account, THE System SHALL provide an "Edit" action
2. WHEN editing an account, THE System SHALL allow the user to change the account name
3. WHEN editing an account, THE System SHALL allow the user to change the account type
4. WHEN editing an account, THE System SHALL NOT allow changing the account balance directly (balance is managed through transactions and checkpoints)
5. WHEN editing an account, THE System SHALL NOT allow changing the currency (currency is set at workspace level)
6. WHEN account changes are saved, THE System SHALL update the modification timestamp

### Requirement 4: Account Deletion

**User Story:** As a user, I want to delete accounts I no longer use, so that I can keep my workspace clean and focused on active accounts.

#### Acceptance Criteria

1. WHEN viewing an account, THE System SHALL provide a "Delete" action
2. WHEN attempting to delete an account, THE System SHALL check if the account has any transactions
3. WHEN an account has transactions, THE System SHALL prevent deletion and display an error message explaining that accounts with transactions cannot be deleted
4. WHEN an account has no transactions, THE System SHALL allow deletion after user confirmation
5. WHEN deleting an account, THE System SHALL require explicit user confirmation with a warning about the permanent nature of deletion
6. WHEN an account is deleted, THE System SHALL remove it from the database and update all related views

### Requirement 5: Account Selection in Transactions

**User Story:** As a user, I want to select which account a transaction belongs to, so that I can track money movement across my different accounts.

#### Acceptance Criteria

1. WHEN creating a transaction, THE System SHALL display a dropdown/selector for choosing the account
2. WHEN displaying the account selector, THE System SHALL show all active accounts for the workspace
3. WHEN no account is explicitly selected, THE System SHALL use the default account (first created account)
4. WHEN displaying accounts in the selector, THE System SHALL show the account name and type for clarity
5. WHEN an account is selected for a transaction, THE System SHALL associate the transaction with that account permanently

### Requirement 6: Account Balance Calculation

**User Story:** As a user, I want to see accurate account balances, so that I know how much money I have in each account.

#### Acceptance Criteria

1. WHEN displaying an account balance, THE System SHALL calculate it based on the initial balance plus all income transactions minus all expense transactions
2. WHEN a new transaction is added to an account, THE System SHALL update the account's balance automatically
3. WHEN a transaction is edited, THE System SHALL recalculate the affected account's balance
4. WHEN a transaction is deleted, THE System SHALL recalculate the affected account's balance
5. WHEN displaying negative balances (e.g., credit cards), THE System SHALL clearly indicate the negative amount with appropriate formatting

### Requirement 7: Account Type Indicators

**User Story:** As a user, I want to easily identify account types, so that I can quickly distinguish between my checking, savings, credit, and investment accounts.

#### Acceptance Criteria

1. WHEN displaying an account, THE System SHALL show a visual indicator (icon or badge) for the account type
2. WHEN displaying a checking account, THE System SHALL use a distinctive icon (e.g., wallet or card icon)
3. WHEN displaying a savings account, THE System SHALL use a distinctive icon (e.g., piggy bank or vault icon)
4. WHEN displaying a credit account, THE System SHALL use a distinctive icon (e.g., credit card icon)
5. WHEN displaying an investment account, THE System SHALL use a distinctive icon (e.g., chart or growth icon)
6. WHEN displaying account type indicators, THE System SHALL use colors consistent with the Executive Lounge design system

### Requirement 8: Multi-Account Dashboard Summary

**User Story:** As a user with multiple accounts, I want to see a summary of all my accounts, so that I can understand my total financial position at a glance.

#### Acceptance Criteria

1. WHEN viewing the accounts dashboard, THE System SHALL display the total balance across all accounts
2. WHEN calculating total balance, THE System SHALL sum all account balances in the workspace currency
3. WHEN displaying the accounts summary, THE System SHALL show the count of accounts by type (e.g., "2 Checking, 1 Savings")
4. WHEN displaying the accounts summary, THE System SHALL highlight accounts with negative balances (debts)
5. WHEN displaying the accounts summary, THE System SHALL provide quick access to create a new account

### Requirement 9: Account Validation

**User Story:** As a user, I want the system to validate my account data, so that I don't create invalid or duplicate accounts.

#### Acceptance Criteria

1. WHEN creating an account, THE System SHALL validate that the account name is not empty
2. WHEN creating an account, THE System SHALL validate that the account name does not exceed 100 characters
3. WHEN creating an account, THE System SHALL validate that a valid account type is selected
4. WHEN creating an account, THE System SHALL validate that the initial balance is a valid number
5. WHEN validation fails, THE System SHALL display clear, specific error messages indicating what needs to be corrected

### Requirement 10: Account Integration with Checkpoints

**User Story:** As a user, I want my accounts to work seamlessly with checkpoints, so that I can reconcile each account's balance separately.

#### Acceptance Criteria

1. WHEN creating a checkpoint, THE System SHALL display all active accounts for balance entry
2. WHEN entering checkpoint balances, THE System SHALL show the current calculated balance for each account as a reference
3. WHEN a checkpoint is created, THE System SHALL store the actual balance for each account separately
4. WHEN calculating reconciliation gaps, THE System SHALL compute gaps per account (not just total)
5. WHEN displaying checkpoint history, THE System SHALL show which accounts were included in each checkpoint
