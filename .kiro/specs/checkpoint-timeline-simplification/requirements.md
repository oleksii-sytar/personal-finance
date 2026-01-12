# Checkpoint Timeline Simplification Requirements

## Introduction

This specification simplifies the over-engineered reconciliation system to a basic checkpoint timeline approach. Checkpoints are simple balance snapshots that help users track gaps between recorded transactions and actual account balance. The complex reconciliation page and workflows are removed in favor of a streamlined checkpoint system integrated directly into the transaction page.

## Glossary

- **Checkpoint**: A balance snapshot at a specific date with calculated gap between expected and actual balance
- **Expected_Balance**: The calculated balance based on the previous checkpoint plus all transactions since then
- **Actual_Balance**: The real balance as reported by the user from their bank/account statements  
- **Gap**: The difference between actual and expected balances (Actual - Expected), stored in the checkpoint record
- **Checkpoint_Timeline**: Visual representation of checkpoints showing dates, balances, and gaps over time

## Requirements

### Requirement 1: Remove Reconciliation Page

**User Story:** As a developer, I want to remove the unnecessary reconciliation page, so that the application is simpler.

#### Acceptance Criteria

1. WHEN the refactor is complete THEN the system SHALL NOT have a separate reconciliation page
2. WHEN the refactor is complete THEN the system SHALL NOT have reconciliation-specific routes
3. WHEN the refactor is complete THEN the system SHALL retain the checkpoint database model
4. WHEN the refactor is complete THEN the system SHALL remove all complex reconciliation components and services
5. WHEN the refactor is complete THEN the system SHALL remove reconciliation navigation from the dashboard layout

### Requirement 2: Checkpoint Creation on Transaction Page

**User Story:** As a user, I want to create checkpoints directly from the transaction page, so that I don't need to navigate elsewhere.

#### Acceptance Criteria

1. WHEN user is on the transaction page THEN the system SHALL display a "Add Checkpoint" button
2. WHEN user clicks "Add Checkpoint" THEN the system SHALL open a modal window
3. WHEN user submits checkpoint with date and actual balance THEN the system SHALL calculate the expected balance from transactions
4. WHEN calculating expected balance THEN the system SHALL sum all transactions between the last checkpoint and current checkpoint date
5. WHEN saving checkpoint THEN the system SHALL calculate and store the gap (actual - expected) in the checkpoint record
6. WHEN checkpoint is created THEN the system SHALL close the modal and refresh the view

### Requirement 3: Checkpoint Timeline View

**User Story:** As a user, I want to see a timeline of my checkpoints with calculated gaps, so that I can understand discrepancies between my recorded transactions and actual balance.

#### Acceptance Criteria

1. WHEN user views transaction page THEN the system SHALL display a timeline component showing checkpoints
2. WHEN displaying timeline THEN the system SHALL show each checkpoint with: date, actual balance, expected balance, and gap amount
3. WHEN gap exists between checkpoint balance and calculated balance THEN the system SHALL visually highlight the discrepancy
4. WHEN user hovers/clicks a checkpoint on timeline THEN the system SHALL show details including transaction count for the period
5. WHEN displaying gaps THEN the system SHALL use positive values for surplus (actual > expected) and negative for deficit (actual < expected)
6. WHEN timeline is empty THEN the system SHALL show a message encouraging the user to create their first checkpoint

### Requirement 4: Gap Calculation and Storage

**User Story:** As a system, I want to calculate and store gaps automatically when checkpoints are created, so that historical gap data is preserved.

#### Acceptance Criteria

1. WHEN creating a checkpoint THEN the system SHALL find the most recent previous checkpoint for the same account
2. WHEN calculating expected balance THEN the system SHALL sum all transactions between previous checkpoint date and current checkpoint date
3. WHEN no previous checkpoint exists THEN the system SHALL use zero as the starting balance for expected calculation
4. WHEN gap is calculated THEN the system SHALL store it as: gap = actual_balance - expected_balance
5. WHEN checkpoint is saved THEN the system SHALL persist the gap value in the checkpoint database record
6. WHEN displaying checkpoints THEN the system SHALL show the stored gap value, not recalculate it

### Requirement 5: Automatic Gap Recalculation

**User Story:** As a user, I want gaps to be automatically recalculated when I add transactions, so that my checkpoint gaps always reflect the current state.

#### Acceptance Criteria

1. WHEN a transaction is added after the last checkpoint date THEN the system SHALL automatically recalculate the gap for the last checkpoint
2. WHEN a transaction is modified that affects a checkpoint period THEN the system SHALL recalculate the affected checkpoint's gap
3. WHEN a transaction is deleted that affects a checkpoint period THEN the system SHALL recalculate the affected checkpoint's gap
4. WHEN gap is recalculated THEN the system SHALL update the expected_balance and gap fields in the checkpoint record
5. WHEN displaying timeline THEN the system SHALL always show the most current gap values
6. WHEN multiple transactions affect the same checkpoint THEN the system SHALL recalculate the gap only once after all changes

### Requirement 6: Simplified Data Model

**User Story:** As a developer, I want a simple checkpoint data model, so that the system is maintainable.

#### Acceptance Criteria

1. WHEN checkpoint is created THEN the system SHALL store: id, date, actual_balance, expected_balance, gap, account_id, workspace_id, created_at
2. WHEN querying checkpoints THEN the system SHALL order by date descending to show most recent first
3. WHEN deleting checkpoints THEN the system SHALL allow deletion of any checkpoint without complex validation
4. WHEN updating checkpoints THEN the system SHALL recalculate gap if actual_balance is changed
5. WHEN checkpoint exists THEN the system SHALL NOT require complex reconciliation period or session tracking