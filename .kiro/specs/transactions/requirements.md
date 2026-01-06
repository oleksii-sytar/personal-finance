# Requirements Document

## Introduction

The Transactions feature is the core functionality of Forma, enabling users to quickly capture, manage, and organize their financial transactions. This system prioritizes speed of entry (under 5 seconds on mobile) while providing comprehensive management capabilities for desktop users.

## Glossary

- **Transaction**: A financial record representing money movement (income or expense) that belongs to a specific workspace
- **Quick_Entry**: Mobile-optimized transaction creation in under 5 seconds
- **Category**: User-defined classification for organizing transactions within a workspace
- **Transaction_Type**: Classification of transaction as Income or Expense with optional subtypes
- **Recurring_Transaction**: Template for automatically creating expected future transactions
- **Expected_Transaction**: Future transaction created from recurring template, awaiting confirmation
- **Workspace**: Core linking instance that owns all transactions and controls user access
- **Workspace_Member**: User assigned to a workspace who can create/edit transactions within that workspace
- **Access_Control**: Permission system based on workspace membership

## Requirements

### Requirement 1: Quick Transaction Entry (Mobile)

**User Story:** As a user on mobile, I want to add a transaction in under 5 seconds, so that I can capture expenses immediately without friction.

#### Acceptance Criteria

1. WHEN a user is on any main screen, THE System SHALL display a floating "+" button
2. WHEN a user taps the "+" button, THE System SHALL open quick entry form with numeric keypad active
3. WHEN the quick entry form opens, THE System SHALL focus on amount field as the only required field
4. WHEN a user selects category, THE System SHALL show recent/frequent categories first
5. WHEN a user skips category selection, THE System SHALL apply a default category
6. WHEN the form loads, THE System SHALL default transaction type to "Expense" with one-tap switch to "Income"
7. WHEN a user taps "Save", THE System SHALL complete entry and close form
8. WHEN a transaction is saved successfully, THE System SHALL provide haptic feedback confirmation
9. WHEN a transaction is created via quick entry, THE System SHALL log it with current date/time by default

### Requirement 2: Detailed Transaction Entry (Desktop)

**User Story:** As a user on desktop, I want to enter transactions with full details using keyboard shortcuts, so that I can efficiently log transactions during reconciliation.

#### Acceptance Criteria

1. WHEN a user presses "N" hotkey from any screen, THE System SHALL open new transaction form
2. WHEN the transaction form is open, THE System SHALL support Tab key navigation between fields in logical order
3. THE Transaction_Form SHALL include fields: Amount, Type, Category, Date, Currency, Notes
4. WHEN a user types in category field, THE System SHALL provide type-ahead search functionality
5. WHEN a user presses Enter or Cmd+S, THE System SHALL save the transaction
6. WHEN a user presses Escape key, THE System SHALL cancel entry with confirmation if data was entered
7. WHEN currency selector is opened, THE System SHALL show UAH as default with EUR/USD as options
8. WHEN a foreign currency is selected, THE System SHALL auto-convert to UAH and display both amounts

### Requirement 3: Transaction List Display

**User Story:** As a user, I want to view all my transactions, so that I can review spending history and verify entries.

#### Acceptance Criteria

1. WHEN the transaction list loads, THE System SHALL display transactions with most recent first by default
2. FOR EACH transaction displayed, THE System SHALL show: date, amount, category, type (income/expense)
3. WHEN displaying income transactions, THE System SHALL show amounts in Growth Emerald color
4. WHEN displaying expense transactions, THE System SHALL show amounts in default text color
5. WHEN a user scrolls to bottom of list, THE System SHALL load more transactions automatically
6. WHEN a user taps a transaction, THE System SHALL open detail view for editing
7. WHEN a user swipes left on a transaction, THE System SHALL reveal delete action with confirmation

### Requirement 4: Transaction Filtering and Search

**User Story:** As a user, I want to filter and search transactions, so that I can find specific entries quickly.

#### Acceptance Criteria

1. THE System SHALL provide date range filters: Today, This Week, This Month, Custom
2. THE System SHALL provide category filter with multi-select capability
3. THE System SHALL provide transaction type filter via tabs: Income, Expense, All
4. THE System SHALL provide family member filter showing who recorded each transaction
5. THE System SHALL provide text search functionality for transaction notes field
6. WHEN filters are active, THE System SHALL clearly display them with easy removal option
7. WHEN a user applies filters, THE System SHALL persist filter state during the session
8. WHEN a user creates a new transaction with active filters, THE System SHALL apply those filters to pre-populate the creation form

### Requirement 5: Transaction Editing

**User Story:** As a user, I want to edit a transaction, so that I can correct mistakes or add missing information.

#### Acceptance Criteria

1. THE System SHALL allow editing of all transaction fields
2. WHEN edit form opens, THE System SHALL pre-fill form with current transaction values
3. WHEN a user saves edits, THE System SHALL update transaction and return to list
4. WHEN a transaction is edited, THE System SHALL update "Last modified" timestamp
5. WHEN a transaction is edited, THE System SHALL record "Modified by" user information

### Requirement 6: Transaction Deletion

**User Story:** As a user, I want to delete a transaction, so that I can remove erroneous entries.

#### Acceptance Criteria

1. WHEN a user initiates delete, THE System SHALL require confirmation with "Are you sure?" prompt
2. WHEN deletion is confirmed, THE System SHALL remove transaction from list immediately
3. WHEN a transaction is deleted, THE System SHALL provide undo option for 10 seconds
4. WHEN a transaction is deleted, THE System SHALL implement soft delete for admin recovery

### Requirement 7: Category Management

**User Story:** As a user, I want to manage transaction categories, so that I can organize expenses according to my family's needs.

#### Acceptance Criteria

1. THE System SHALL make category management accessible from transaction entry (inline)
2. WHEN a user types new category name and presses Enter, THE System SHALL create new category
3. THE System SHALL allow users to edit existing category names
4. WHEN a user deletes a category, THE System SHALL only allow deletion if no transactions are assigned
5. THE System SHALL allow users to merge categories by reassigning all transactions
6. WHEN a workspace is created, THE System SHALL provide default categories
7. THE System SHALL support optional icon/emoji assignment for categories

### Requirement 8: Transaction Type Management

**User Story:** As a user, I want to manage transaction types, so that I can classify income and expenses by source.

#### Acceptance Criteria

1. THE System SHALL support custom transaction types beyond basic Income/Expense
2. THE System SHALL make type management accessible from Transactions section
3. WHEN creating types, THE System SHALL require each type to belong to either Income or Expense family
4. THE System SHALL provide special "Other" type for gap reconciliation
5. THE System SHALL allow adding, editing, and deleting types with transaction reassignment for deletions

### Requirement 9: Recurring Transaction Management

**User Story:** As a user, I want to set up recurring transactions, so that expected income and expenses are automatically tracked.

#### Acceptance Criteria

1. WHEN entering any transaction, THE System SHALL allow user to mark it as recurring
2. THE System SHALL provide recurring options: Daily, Weekly, Monthly, Yearly
3. WHEN setting up recurring transaction, THE System SHALL allow user to set expected amount and date
4. THE System SHALL create "expected" transactions for future occurrences based on recurring pattern
5. WHEN displaying expected transactions, THE System SHALL show them differently (e.g., dashed border)
6. WHEN an expected transaction occurs, THE System SHALL allow user to "confirm" it
7. WHEN confirming expected transaction, THE System SHALL allow user to adjust actual amount if different (1-2 taps)
8. THE System SHALL allow user to skip occurrence if transaction doesn't happen
9. THE System SHALL provide list of all recurring transactions accessible from Transactions section

### Requirement 10: Workspace-Based Access Control

**User Story:** As a system administrator, I want to ensure transaction access is controlled by workspace membership, so that users can only access transactions within their assigned workspaces.

#### Acceptance Criteria

1. WHEN a user attempts to create a transaction, THE System SHALL verify user is assigned to the target workspace
2. WHEN a user attempts to view transactions, THE System SHALL only display transactions from workspaces where user is a member
3. WHEN a user attempts to edit a transaction, THE System SHALL verify user has access to the transaction's workspace
4. WHEN a user attempts to delete a transaction, THE System SHALL verify user has access to the transaction's workspace
5. THE System SHALL link every transaction to exactly one workspace
6. THE System SHALL prevent cross-workspace transaction access regardless of user permissions