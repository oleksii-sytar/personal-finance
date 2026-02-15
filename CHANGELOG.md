# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-02-15

### Added
- **Current Month Overview Widget**: Practical, easy-to-understand financial overview
  - Income tracking (earned + planned) with green highlighting
  - Expense tracking (spent + planned) with clear separation
  - Average daily spending based on current month only
  - Projected remaining spending for rest of month
  - Month end net balance projection (income - expenses)
  - Color-coded indicators (green for surplus, red for deficit)
  - Top 5 expense categories with visual progress bars
  - Works from day 1 (no "need more data" messages)
  - Simple, transparent calculations

### Changed
- **Real-Time Data Refresh**: Removed React Query caching for critical financial data
  - Balance updates immediately when navigating between pages
  - Account data always fresh (staleTime: 0, gcTime: 0)
  - Account balances always fresh (staleTime: 0, gcTime: 0)
  - Transaction data already had no caching
  - Critical for financial accuracy

### Fixed
- **Balance Not Updating**: Fixed balance not refreshing when returning to dashboard
  - Problem: 5-minute cache prevented immediate updates
  - Solution: Removed caching from accounts and account balances hooks
  - Impact: Users always see latest balance information

### Removed
- **Spending Trends Widget**: Replaced with simpler Current Month Overview
  - Old widget had complex 3-month averages
  - Caused false "unusual spending" warnings for new users
  - Files preserved but not used (can be restored if needed)

### Technical
- Updated `src/hooks/use-accounts.ts` - Removed caching
- Updated `src/hooks/use-account-balances.ts` - Removed caching
- Created `src/components/forecast/current-month-overview.tsx` - New widget (400+ lines)
- Updated `src/app/(dashboard)/dashboard/page.tsx` - Integrated new widget
- Documentation: `FIXES_BALANCE_AND_INCOME.md`, `IMPLEMENTATION_CURRENT_MONTH_OVERVIEW.md`

### User Impact
- New users can start using app immediately
- Existing users get more accurate balance information
- Better visibility into income and expenses
- Clearer financial projections
- Positive, informative experience

## [1.2.0] - TBD (Pending Approval)

### Added
- **Daily Cash Flow Forecast (CRITICAL)**: Visual chart showing projected balance for each day
  - Conservative calculations with 10% safety multiplier
  - Color-coded risk indicators (🟢 Safe, 🟡 Warning, 🔴 Danger)
  - Smart averaging excludes large one-time purchases
  - Requires minimum 14 days of transaction history
  - Real-time updates when transactions change
  - Multi-month view capability
- **Upcoming Payments & Risk Assessment (CRITICAL)**: Shows planned transactions with risk indicators
  - 🟢 Green: Sufficient funds, 🟡 Yellow: Tight balance, 🔴 Red: Insufficient funds
  - Smart recommendations for each payment
  - Quick "Mark as Paid" action
  - Payment totals for 7/14/30 day periods
  - Sorted by urgency (soonest first)
- **Future Transaction Planning**: New "planned" status for transactions up to 6 months ahead
  - Planned transactions don't affect current balances
  - Excluded from reconciliation calculations
  - Visual distinction with badges
  - Easy conversion to completed status
- **Month-Based Navigation**: Month selector with transaction counts
  - Previous/Next month navigation
  - "Current Month" quick jump
  - Automatic transaction filtering
  - URL state persistence
- **Balance Overview Widget**: Total balance across all accounts
  - Account-level breakdown
  - Reconciliation status indicators
  - Asset/debt separation
  - Quick reconciliation links
- **Spending Trends Analysis**: Category-based spending insights
  - Month-over-month comparison
  - 3-month average comparison
  - Unusual spending detection (>50% deviation)
  - Top 3 categories highlighted
  - Trend indicators (↑↓→)
  - Average daily spending display
- **User Settings**: Customizable forecast preferences
  - Minimum safe balance threshold
  - Safety buffer days (1-30)
  - Settings persistence per user/workspace
  - Real-time forecast updates

### Changed
- **Enhanced Onboarding**: Improved guided user journey
  - Consistent access control across all pages
  - Settings always accessible
  - Account requirement for transactions
  - Clear guidance at each step
- **Transaction Schema**: Added status field for planned vs completed
  - `status` column: 'completed' (default) or 'planned'
  - `planned_date` column for future transactions (max 6 months)
  - `completed_at` timestamp for conversion tracking
- **Dashboard Layout**: Reorganized with new forecast and insights widgets
  - Responsive grid layout
  - Loading states with skeleton loaders
  - Empty states with helpful guidance
  - Error boundaries for graceful degradation

### Technical
- **Database Migrations**: 
  - Added transaction status and planned_date fields
  - Created user_settings table
  - Added performance indexes
  - Backfilled existing transactions as 'completed'
- **Calculation Engine**:
  - Average daily spending calculator (excludes outliers)
  - Daily forecast calculator (conservative estimates)
  - Payment risk assessment algorithm
  - Spending trends analyzer
- **Performance Optimizations**:
  - 5-minute cache TTL for forecasts
  - Optimized queries with indexes
  - React Query for smart caching
  - Lazy loading for widgets
- **Test Coverage**:
  - 90%+ for calculation engine
  - 80%+ for server actions
  - 70%+ for components
  - 75%+ overall coverage
- **Documentation**:
  - Comprehensive manual test cases (60+ scenarios)
  - Calculation logic documentation
  - Forecast API documentation
  - Deployment and monitoring guides

### Fixed
- Improved error handling for insufficient data scenarios
- Better empty states throughout application
- Enhanced accessibility (WCAG 2.1 AA compliant)
- Consistent Executive Lounge aesthetic

### Performance
- Dashboard loads in < 3 seconds
- Forecast calculation < 2 seconds
- Month filtering < 100ms
- Cache hit rate > 80%

## [1.1.3] - 2026-02-12

### Fixed
- **Critical RLS Policy Fix**: Fixed workspace member access to all workspace resources
  - Members can now access accounts, categories, transaction types, and all workspace data
  - Implemented SECURITY DEFINER function `user_has_workspace_access()` to eliminate ambiguous column references
  - Fixed PostgreSQL error 42P17 (ambiguous column reference) in RLS policies
  - All workspace-related tables now properly check workspace membership via `workspace_members` table
- **Invitation System**: Fixed invitation acceptance page that was showing "under construction"
  - Restored `InviteAcceptanceForm` component
  - Changed redirect to force full page reload for proper workspace context update
- **Transaction Sorting**: Fixed transaction list to sort by `transaction_date` (when transaction happened) instead of `created_at`
  - Most recent transactions now appear at the top based on actual transaction date
- **Category Management**: Added workspace existence check to prevent showing category manager without workspace

### Security
- Enhanced RLS policies across all workspace-related tables
- Implemented secure workspace membership validation
- Enabled RLS on all tables to prevent unauthorized access

### Technical Details
- Created `user_has_workspace_access(workspace_uuid UUID)` SECURITY DEFINER function
- Updated RLS policies for: accounts, categories, transaction_types, workspaces, balance_update_history, reconciliation_sessions, exchange_rates
- Fixed ambiguous column references in Supabase queries
- Improved error handling in account creation with helpful messages

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
