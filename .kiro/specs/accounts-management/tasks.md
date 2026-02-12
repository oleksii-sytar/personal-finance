# Implementation Plan: Accounts Management

## Overview

This implementation plan breaks down the Accounts Management feature into discrete, incremental tasks. The approach follows a bottom-up strategy: building foundational utilities and components first, then composing them into complete features. Each task builds on previous work, ensuring no orphaned code and continuous integration.

The implementation prioritizes mobile-first responsive design with the Executive Lounge aesthetic, using glass cards, warm colors, and smooth transitions throughout.

## Tasks

- [x] 1. Set up foundational types and utilities
  - Create TypeScript interfaces for Account, AccountType, and form data types
  - Create account type icon mapping utility
  - Create account type label mapping utility
  - Create currency formatting utility for account balances
  - _Requirements: 1.2, 1.3, 2.6, 7.1-7.5_

- [x] 2. Implement AccountTypeIcon component
  - [x] 2.1 Create AccountTypeIcon component with icon mapping
    - Map checking → Wallet icon
    - Map savings → PiggyBank icon
    - Map credit → CreditCard icon
    - Map investment → TrendingUp icon
    - Apply Executive Lounge accent colors
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 2.2 Write property test for AccountTypeIcon
    - **Property 1: Icon Mapping Correctness**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

- [x] 3. Implement AccountTypeBadge component
  - [x] 3.1 Create AccountTypeBadge component with glass styling
    - Display user-friendly labels (e.g., "Checking Account")
    - Apply glass background with type-specific accent colors
    - Ensure mobile-friendly sizing (min 44px touch target)
    - _Requirements: 2.6, 7.6_
  
  - [ ]* 3.2 Write unit tests for AccountTypeBadge
    - Test label mapping for all account types
    - Test styling consistency
    - _Requirements: 2.6_

- [x] 4. Implement account validation schemas
  - [x] 4.1 Create Zod schemas for account forms
    - Create accountFormSchema with name, type, initial_balance validation
    - Create updateAccountSchema (name and type only)
    - Implement validation error messages
    - _Requirements: 1.2, 1.3, 1.4, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 4.2 Write property test for account name validation
    - **Property 1: Account Name Validation**
    - **Validates: Requirements 1.2, 9.1, 9.2**
  
  - [ ]* 4.3 Write property test for account type validation
    - **Property 2: Account Type Validation**
    - **Validates: Requirements 1.3, 9.3**
  
  - [ ]* 4.4 Write property test for initial balance validation
    - **Property 3: Initial Balance Handling**
    - **Validates: Requirements 1.4, 9.4**

- [x] 5. Implement AccountCard component
  - [x] 5.1 Create AccountCard component with Executive Lounge styling
    - Implement glass card with backdrop-filter blur
    - Display account type icon (top-left)
    - Display account name as heading
    - Display formatted balance (large, prominent)
    - Display account type badge
    - Add hover effects (elevation, transform)
    - Show edit/delete buttons (hover reveal on desktop, always visible on mobile)
    - Handle negative balance styling (red tint for debt)
    - _Requirements: 2.2, 2.3, 6.5, 7.1_
  
  - [ ]* 5.2 Write property test for account information display
    - **Property 8: Account Information Completeness**
    - **Validates: Requirements 2.2, 5.4**
  
  - [ ]* 5.3 Write property test for currency formatting
    - **Property 9: Currency Formatting Consistency**
    - **Validates: Requirements 2.3, 6.5**
  
  - [ ]* 5.4 Write unit tests for AccountCard interactions
    - Test edit button click handler
    - Test delete button click handler
    - Test hover states
    - _Requirements: 3.1, 4.1_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement AccountForm component
  - [x] 7.1 Create AccountForm component with validation
    - Create form with account name input (max 100 chars)
    - Create account type dropdown (checking, savings, credit, investment)
    - Create initial balance input (only shown on create mode)
    - Display currency as read-only (inherited from workspace)
    - Implement real-time validation with Zod
    - Display validation errors below fields
    - Apply Executive Lounge form styling (glass inputs, rounded corners)
    - Handle loading states during submission
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 3.5, 9.1-9.5_
  
  - [ ]* 7.2 Write property test for validation error messages
    - **Property 23: Validation Error Specificity**
    - **Validates: Requirements 9.5**
  
  - [ ]* 7.3 Write unit tests for AccountForm
    - Test form submission with valid data
    - Test form submission with invalid data
    - Test edit mode vs create mode differences
    - Test cancel button behavior
    - _Requirements: 1.2, 1.3, 1.4, 3.2, 3.3_

- [x] 8. Implement AccountSelector component
  - [x] 8.1 Create AccountSelector dropdown for transaction forms
    - Fetch accounts for workspace using getAccounts()
    - Display account name + type icon in dropdown
    - Show "Default" badge for default account
    - Implement keyboard navigation support
    - Apply mobile-optimized touch targets (min 44px)
    - Handle loading and error states
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 8.2 Write property test for account selector completeness
    - **Property 15: Account Selector Completeness**
    - **Validates: Requirements 5.2**
  
  - [ ]* 8.3 Write unit tests for AccountSelector
    - Test account list rendering
    - Test default account indicator
    - Test selection change handler
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 9. Implement AccountSummary widget
  - [x] 9.1 Create AccountSummary component with aggregate statistics
    - Calculate and display total balance across all accounts
    - Display account count by type (e.g., "2 Checking, 1 Savings")
    - Identify and highlight accounts with negative balances
    - Add "Add Account" quick action button
    - Apply glass card styling with Executive Lounge aesthetic
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 9.2 Write property test for total balance aggregation
    - **Property 20: Total Balance Aggregation**
    - **Validates: Requirements 8.1, 8.2**
  
  - [ ]* 9.3 Write property test for account type counting
    - **Property 21: Account Type Counting**
    - **Validates: Requirements 8.3**
  
  - [ ]* 9.4 Write property test for debt account identification
    - **Property 22: Debt Account Identification**
    - **Validates: Requirements 8.4**

- [x] 10. Implement DeleteAccountDialog component
  - [x] 10.1 Create DeleteAccountDialog with transaction check
    - Check transaction count before showing confirmation
    - Display error message if transactions exist (prevent deletion)
    - Display confirmation dialog if no transactions
    - Show warning about permanent deletion
    - Implement loading state during deletion
    - Apply Executive Lounge dialog styling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 10.2 Write property test for deletion prevention
    - **Property 13: Transaction-Based Deletion Prevention**
    - **Validates: Requirements 4.2, 4.3**
  
  - [ ]* 10.3 Write property test for clean deletion
    - **Property 14: Clean Account Deletion**
    - **Validates: Requirements 4.4, 4.6**

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement AccountsPage (main dashboard)
  - [x] 12.1 Create AccountsPage with server-side data fetching
    - Fetch accounts using getAccounts() server action
    - Display AccountSummary widget at top
    - Display grid of AccountCard components (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
    - Add floating "Add Account" button (bottom-right on mobile)
    - Implement empty state for first-time users
    - Handle loading states with Suspense
    - Apply container padding and spacing
    - _Requirements: 1.1, 2.1, 2.4, 2.5_
  
  - [ ]* 12.2 Write property test for account list retrieval
    - **Property 7: Complete Account List Retrieval**
    - **Validates: Requirements 2.1**
  
  - [ ]* 12.3 Write property test for chronological ordering
    - **Property 10: Chronological Ordering**
    - **Validates: Requirements 2.4**
  
  - [ ]* 12.4 Write integration tests for AccountsPage
    - Test server-side data fetching
    - Test empty state display
    - Test account grid rendering
    - _Requirements: 2.1, 2.4, 2.5_

- [x] 13. Implement account creation flow
  - [x] 13.1 Wire AccountForm to createAccount server action
    - Handle form submission with validation
    - Call createAccount() with form data
    - Handle success: show toast, refresh page, close modal
    - Handle errors: display validation errors or server errors
    - Implement optimistic UI updates
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [ ]* 13.2 Write property test for currency inheritance
    - **Property 4: Currency Inheritance**
    - **Validates: Requirements 1.5**
  
  - [ ]* 13.3 Write property test for timestamp recording
    - **Property 5: Timestamp Recording**
    - **Validates: Requirements 1.6, 3.6**
  
  - [ ]* 13.4 Write property test for default account assignment
    - **Property 6: Default Account Assignment**
    - **Validates: Requirements 1.7**
  
  - [ ]* 13.5 Write integration tests for account creation
    - Test successful account creation
    - Test validation error handling
    - Test first account marked as default
    - Test subsequent accounts not marked as default
    - _Requirements: 1.1-1.7_

- [x] 14. Implement account editing flow
  - [x] 14.1 Wire AccountForm to updateAccount server action
    - Pre-populate form with existing account data
    - Disable balance and currency fields (read-only)
    - Call updateAccount() with form data
    - Handle success: show toast, refresh page, close modal
    - Handle errors: display validation errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 14.2 Write property test for account update persistence
    - **Property 12: Account Update Persistence**
    - **Validates: Requirements 3.2, 3.3**
  
  - [ ]* 14.3 Write integration tests for account editing
    - Test successful account update
    - Test name change persistence
    - Test type change persistence
    - Test balance field is read-only
    - Test currency field is read-only
    - _Requirements: 3.1-3.6_

- [x] 15. Implement account deletion flow
  - [x] 15.1 Wire DeleteAccountDialog to deleteAccount server action
    - Check transaction count before deletion
    - Call deleteAccount() if no transactions
    - Handle success: show toast, refresh page, close dialog
    - Handle errors: display error message
    - Implement confirmation step
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x]* 15.2 Write integration tests for account deletion
    - Test deletion prevented when transactions exist
    - Test successful deletion when no transactions
    - Test account removed from database
    - Test error message display
    - _Requirements: 4.1-4.6_

- [x] 16. Checkpoint - Ensure all tests pass
  - ✅ Migration applied: `initial_balance` and `is_default` columns exist
  - ✅ Integration tests created: `tests/integration/account-deletion-flow.test.ts`
  - ✅ Unit tests passing: 54 tests across account utilities, constants, and components
  - ✅ Database schema verified and working correctly
  - See: `TASK_15_16_COMPLETION_SUMMARY.md` for detailed completion report

- [x] 17. Implement balance calculation integration
  - [x] 17.1 Create balance recalculation utility
    - Implement function to calculate balance from transactions
    - Formula: initial_balance + sum(income) - sum(expense)
    - Handle edge cases (no transactions, negative balances)
    - _Requirements: 6.1_
  
  - [ ]* 17.2 Write property test for balance calculation
    - **Property 18: Balance Calculation Correctness**
    - **Validates: Requirements 6.1**
  
  - [ ]* 17.3 Write property test for balance consistency
    - **Property 19: Balance Consistency After Transaction Changes**
    - **Validates: Requirements 6.2, 6.3, 6.4**
  
  - [x] 17.4 Integrate balance recalculation with transaction actions
    - Update createTransaction to recalculate account balance
    - Update updateTransaction to recalculate account balance
    - Update deleteTransaction to recalculate account balance
    - Ensure atomic updates (transaction + balance update)
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [ ]* 17.5 Write integration tests for balance updates
    - Test balance updates after transaction creation
    - Test balance updates after transaction editing
    - Test balance updates after transaction deletion
    - Test balance calculation with multiple transactions
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 18. Implement transaction form integration
  - [x] 18.1 Integrate AccountSelector into transaction forms
    - Add AccountSelector to TransactionForm component
    - Set default account if no account selected
    - Store account_id with transaction
    - Update transaction form validation to include account_id
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [ ]* 18.2 Write property test for default account selection
    - **Property 16: Default Account Selection**
    - **Validates: Requirements 5.3**
  
  - [ ]* 18.3 Write property test for transaction-account association
    - **Property 17: Transaction-Account Association Persistence**
    - **Validates: Requirements 5.5**
  
  - [ ]* 18.4 Write integration tests for transaction-account integration
    - Test account selector displays all accounts
    - Test default account is pre-selected
    - Test transaction created with selected account
    - Test account_id persists with transaction
    - _Requirements: 5.1-5.5_

- [x] 19. Implement checkpoint integration
  - [x] 19.1 Update checkpoint creation modal with account list
    - Fetch all accounts for workspace
    - Display each account with current calculated balance
    - Add input field for actual balance per account
    - Store per-account balances in checkpoint_accounts table
    - Calculate reconciliation gap per account
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 19.2 Write property test for checkpoint account inclusion
    - **Property 24: Checkpoint Account Inclusion**
    - **Validates: Requirements 10.1**
  
  - [ ]* 19.3 Write property test for reference balance display
    - **Property 25: Checkpoint Reference Balance Display**
    - **Validates: Requirements 10.2**
  
  - [ ]* 19.4 Write property test for per-account balance storage
    - **Property 26: Checkpoint Per-Account Balance Storage**
    - **Validates: Requirements 10.3**
  
  - [ ]* 19.5 Write property test for gap calculation
    - **Property 27: Per-Account Reconciliation Gap Calculation**
    - **Validates: Requirements 10.4**
  
  - [x] 19.6 Update checkpoint history display
    - Show which accounts were included in each checkpoint
    - Display actual vs calculated balance per account
    - Display reconciliation gap per account
    - _Requirements: 10.5_
  
  - [ ]* 19.7 Write property test for checkpoint history
    - **Property 28: Checkpoint History Account Preservation**
    - **Validates: Requirements 10.5**
  
  - [ ]* 19.8 Write integration tests for checkpoint integration
    - Test all accounts displayed in checkpoint form
    - Test calculated balance shown as reference
    - Test per-account balance storage
    - Test gap calculation per account
    - Test checkpoint history display
    - _Requirements: 10.1-10.5_

- [x] 20. Implement responsive design and polish
  - [x] 20.1 Optimize for mobile (iPhone 15/16 Pro)
    - Ensure all touch targets are min 44px
    - Test floating action button positioning
    - Verify glass card styling on mobile
    - Test form inputs on mobile keyboards
    - Optimize grid layouts for small screens
    - _Requirements: All UI requirements_
  
  - [x] 20.2 Optimize for tablet (iPad Air)
    - Test 2-column grid layout
    - Verify hover states work with touch
    - Test landscape and portrait orientations
    - _Requirements: All UI requirements_
  
  - [x] 20.3 Optimize for desktop (14" MacBook Pro)
    - Test 3-column grid layout
    - Verify hover effects and transitions
    - Test keyboard navigation
    - Ensure proper spacing and typography scaling
    - _Requirements: All UI requirements_
  
  - [ ]* 20.4 Write E2E tests for responsive design
    - Test mobile viewport (375px)
    - Test tablet viewport (768px)
    - Test desktop viewport (1440px)
    - _Requirements: All UI requirements_

- [x] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate cross-component interactions and database operations
- E2E tests validate complete user flows across the application
- All components follow the Executive Lounge design system with glass cards, warm colors, and smooth transitions
- Mobile-first approach with responsive scaling to larger screens
- Balance calculation is critical and must be thoroughly tested
- Checkpoint integration requires careful coordination with existing checkpoint system

