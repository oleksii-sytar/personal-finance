# Changelog

All notable changes to this project will be documented in this file.

## [1.1.2] - 2026-02-12

### Fixed
- **Balance calculation errors**: Fixed "Could not find the 'balance' column" error when creating transactions
- **Database schema alignment**: Updated balance calculation utility to use correct column names (`opening_balance` and `current_balance`)
- **Type definitions**: Removed legacy `initial_balance` field from Account interface
- **Test compatibility**: Updated all test files and fixtures to match current database schema

### Technical Details
- Updated `src/lib/utils/balance.ts` to use `opening_balance` and `current_balance` columns
- Removed `initial_balance` from Account type definitions
- Updated account validation schemas to use `opening_balance`
- Fixed all demo components and test fixtures to match new schema
- Simplified `recalculateAccountBalance` to only calculate without updating (calculated balance is computed on-the-fly)

## [1.1.1] - 2026-02-12

### Fixed
- **Real-time reconciliation updates**: Transaction additions/updates/deletions now properly invalidate reconciliation cache and update balances immediately
- **Balance update accessibility**: Users can now update current balance even when account is reconciled (Update button always visible)

### Changed
- Transaction mutation hooks now invalidate reconciliation status queries for real-time UI updates
- Account reconciliation panel always shows Update button for better UX

## [1.1.0] - 2026-02-12

### Added
- **Real-Time Balance Reconciliation System**: Complete replacement of checkpoint-based reconciliation
  - Dual balance fields (opening_balance, current_balance) for continuous reconciliation
  - Real-time difference calculation and display
  - Balance update history with full audit trail
  - Account Reconciliation Panel on transactions page
  - Multi-currency support with automatic conversion
  - Immutable opening balance constraint via database trigger
- React Query hooks for real-time updates (useReconciliationStatus, useAccountDifference)
- Comprehensive reconciliation UI components (ReconciliationBadge, ReconciliationStatus, UpdateBalanceDialog, BalanceUpdateHistory)
- Integration tests for real-time balance updates

### Changed
- Migrated from checkpoint-based to real-time reconciliation workflow
- Updated account schema with opening_balance and current_balance fields
- Enhanced transaction page with reconciliation panel showing all accounts
- Improved balance calculation utilities with comprehensive test coverage

### Removed
- Checkpoint system (tables, components, routes, and related code)
- Reconciliation periods and sessions
- Outdated documentation files (10 historical fix/update documents)
- Example files from hooks directory

### Fixed
- Account balance tracking now uses dual-field approach for better accuracy
- Real-time UI updates without page refresh
- Currency conversion for multi-account reconciliation

### Infrastructure
- Added balance_update_history table for audit trail
- Database indexes for performance optimization
- Comprehensive test coverage (75%+ overall, 90%+ for utilities)

## [1.0.1] - 2026-02-04

### Security
- Removed exposed database credentials from git history
- Removed exposed Supabase service key from git history
- Updated security practices for credential management

### Fixed
- Fixed user deletion cascade constraints in database
- Fixed workspace member deletion flow
- Cleaned up test data from production database

### Changed
- Improved autonomous deployment system
- Updated database migration scripts

## [1.0.0] - 2026-01-01

### Added
- Initial production release
- Multi-workspace support
- Transaction management
- Category organization
- Recurring transactions
- Financial checkpoints
- Multi-currency support
- Workspace member management
- Invitation system
- User authentication and authorization

### Infrastructure
- Supabase database with RLS
- Next.js 15 App Router
- TypeScript strict mode
- Tailwind CSS styling
- Vercel deployment
