# Manual Test Cases - User Journey Enhancement

## Test Environment Setup

**Before Testing:**
1. Start local development server: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Have a fresh browser session (or use incognito mode)
4. Clear any existing test data if needed

**Test Data Preparation:**
- Use test email: `test+[timestamp]@example.com`
- Use consistent test amounts for calculations
- Note: You'll need at least 14 days of transaction history for forecast testing

---

## Test Suite 1: Guided Onboarding Journey (AC 2.1.x)

### Test Case 1.1: New User - No Workspace
**Objective:** Verify new users are guided to create workspace first

**Priority:** P0 (Critical)

**Status:** ✅ PASSED (Approved 2026-02-14)

**Steps:**
1. Register a new account
2. Complete email verification
3. Navigate to Dashboard
4. Navigate to Transactions page
5. Navigate to Accounts page
6. Navigate to Categories page
7. Navigate to Reports page
8. Navigate to Settings page

**Expected Results:**
- ✅ Dashboard: Shows workspace creation prompt
- ✅ Transactions: Shows workspace creation prompt (blocked)
- ✅ Accounts: Shows workspace creation prompt (blocked)
- ✅ Categories: Shows workspace creation prompt (blocked)
- ✅ Reports: Shows workspace creation prompt (blocked)
- ✅ Settings: Accessible without workspace (theme, profile visible)
- ✅ Each blocked page shows single prominent "Create Workspace" button
- ✅ Prompt explains why workspace is needed

**Pass Criteria:** All pages show consistent workspace requirement except Settings

**Test Report (2026-02-14):**

*Initial Issues Found:*
- ❌ Transactions page: Empty page with no workspace creation prompt
- ❌ Categories page: Empty space with no workspace prompt, just "no categories" message

*Root Cause:*
- Transactions page was using `FeatureGate` (for feature flags) instead of `WorkspaceGate` (for workspace checking)
- Categories page had workspace check in `CategoryManager` component with different message
- Reports page was using `FeatureGate` instead of `WorkspaceGate`

*Fixes Applied:*
1. Created new `WorkspaceGate` component (`src/components/shared/workspace-gate.tsx`) for consistent workspace checking
2. Updated transactions page to use `WorkspaceGate` with custom benefits
3. Updated categories page to use `WorkspaceGate` at page level
4. Updated reports page to use `WorkspaceGate` instead of `FeatureGate`
5. Removed duplicate workspace checking from `CategoryManager` component

*Files Modified:*
- `src/components/shared/workspace-gate.tsx` (created)
- `src/app/(dashboard)/transactions/page.tsx` (fixed)
- `src/app/(dashboard)/categories/page.tsx` (fixed)
- `src/app/(dashboard)/reports/page.tsx` (fixed)
- `src/components/categories/category-manager.tsx` (cleaned up)

*Final Result:*
- ✅ All pages now show consistent workspace creation prompts
- ✅ Executive Lounge aesthetic maintained across all prompts
- ✅ Clear benefits displayed with icons for each feature
- ✅ Settings page remains accessible without workspace
- ✅ User experience is uniform across the entire application

**Tester Notes:** "Everything works as expected. All pages show consistent prompts with proper styling and clear guidance."

---

### Test Case 1.2: User with Workspace - No Accounts
**Objective:** Verify users with workspace are guided to create accounts

**Priority:** P0 (Critical)

**Status:** ✅ PASSED (Approved 2026-02-14)

**Steps:**
1. Create a workspace (from Test Case 1.1)
2. Navigate to Dashboard
3. Navigate to Transactions page
4. Navigate to Accounts page
5. Navigate to Categories page
6. Navigate to Settings page

**Expected Results:**
- ✅ Dashboard: Accessible, shows account creation prompt
- ✅ Transactions: Shows "Create Account First" message with prominent button
- ✅ Accounts: Accessible, shows empty state with "Add Account" button
- ✅ Categories: Accessible (auto-created with workspace)
- ✅ Settings: Accessible
- ✅ Transaction page clearly explains need for account before transactions

**Pass Criteria:** Transaction page blocked until account created, other pages accessible

**Tester Notes:** "Dashboard is fine, widgets show button to create accounts. Workspace works perfectly. Transaction page shows proper prompt to create account. Everything works as expected."

---

### Test Case 1.3: User with Workspace and Accounts
**Objective:** Verify full access after completing onboarding

**Priority:** P0 (Critical)

**Status:** ✅ PASSED (Approved 2026-02-14)

**Steps:**
1. Create at least one account (from Test Case 1.2)
2. Navigate to all pages: Dashboard, Transactions, Accounts, Categories, Reports, Settings

**Expected Results:**
- ✅ All pages are accessible
- ✅ No blocking prompts
- ✅ Transaction form is available
- ✅ Dashboard shows widgets (may show "add transactions" if no data)

**Pass Criteria:** Complete application access without restrictions

**Test Report (2026-02-14):**

*Issues Found & Fixed:*
1. ❌ **Reports page - Light theme contrast issue**: White text on white background (not readable)
   - **Fix**: Updated to use `text-primary` and `text-secondary` CSS variables
   
2. ❌ **Dashboard not updating after account creation**: User must manually reload page
   - **Fix**: Added React Query cache invalidation in AccountForm component
   
3. ❌ **Dashboard widgets not updating after transaction changes**: Balances and trends showing stale data
   - **Root Cause**: Transaction mutations only invalidating `['dashboard']` key, not widget-specific keys
   - **Fix**: Updated all transaction mutations (create/update/delete) to invalidate:
     - `['accounts']` - account list
     - `['account-balances']` - balances and reconciliation
     - `['spending-trends']` - spending analysis

*Files Modified:*
- `src/app/(dashboard)/reports/page.tsx` (fixed theme contrast)
- `src/components/accounts/account-form.tsx` (added cache invalidation)
- `src/hooks/use-transactions.ts` (added widget cache invalidation to all mutations)
- `src/hooks/use-accounts.ts` (added refetchOnMount)
- `src/hooks/use-account-balances.ts` (added refetchOnMount)
- `src/hooks/use-spending-trends.ts` (added refetchOnMount)
- `src/app/(dashboard)/dashboard/page.tsx` (added event listener for account changes)

*Final Result:*
- ✅ Reports page readable in both light and dark themes
- ✅ Dashboard widgets update immediately after account creation
- ✅ Dashboard widgets update immediately after transaction create/edit/delete
- ✅ No manual page reload needed
- ✅ All pages accessible and functional

**Tester Notes:** "Perfect! Now it works, no issues. Dashboard updates automatically when creating accounts or adding/editing/deleting transactions."

---


## Test Suite 2: Access Control Consistency (AC 2.2.x)

### Test Case 2.1: Settings Always Accessible
**Objective:** Verify settings page is accessible in all states

**Steps:**
1. Test with no workspace: Navigate to Settings
2. Test with workspace but no accounts: Navigate to Settings
3. Test with workspace and accounts: Navigate to Settings

**Expected Results:**
- ✅ Settings accessible in all states
- ✅ Can change theme without workspace
- ✅ Can edit profile without workspace
- ✅ Workspace management section visible when workspace exists

**Pass Criteria:** Settings never blocked regardless of onboarding state

**Report**: this case is passed 100% there is no like you know objections we can close this test case

---

## Test Suite 3: Future Transaction Planning (AC 2.3.x)

**✅ IMPLEMENTATION STATUS:** All planned transaction features have been implemented and fixed:
- ✅ Mark as Paid functionality wired up (IntegratedTransactionSystem → TransactionList → TransactionItem → MarkAsPaidButton)
- ✅ Balance calculations exclude planned transactions (filters by `status = 'completed'`)
- ✅ When marking as paid, transaction_date updates to today
- ✅ Month filtering uses transaction_date (not created_at)
- ✅ All cache invalidations in place for immediate UI updates

**Files Modified:**
- `src/hooks/use-transactions.ts` - Added `useMarkPlannedAsCompleted` mutation hook
- `src/components/transactions/integrated-transaction-system.tsx` - Added `handleMarkAsPaid` callback
- `src/actions/transactions.ts` - Updated to set transaction_date to today when marking as paid
- `src/lib/utils/balance.ts` - Already correctly filters by `status = 'completed'`

---

### Test Case 3.1: Add Planned Transaction - Future Date
**Objective:** Verify users can create planned transactions for future dates

**Steps:**
1. Navigate to Transactions page
2. Click "Add Transaction"
3. Fill in transaction details:
   - Amount: 500
   - Description: "Rent Payment"
   - Category: Select any
   - Account: Select any
   - Date: Select date 7 days in future
4. Save transaction
5. Check transaction list

**Expected Results:**
- ✅ Date picker allows selecting future dates (up to 6 months ahead)
- ✅ Date picker prevents selecting dates more than 6 months ahead
- ✅ Transaction is created successfully
- ✅ Transaction shows "Planned" badge/indicator
- ✅ Transaction visually distinct from completed transactions

**Pass Criteria:** Future transaction created with planned status and visual distinction



---

### Test Case 3.2: Planned Transaction - Balance Not Affected
**Objective:** Verify planned transactions don't affect current balance

**Steps:**
1. Note current account balance
2. Add planned transaction for future date (amount: 1000)
3. Check account balance immediately
4. Navigate to Accounts page
5. Check account balance display

**Expected Results:**
- ✅ Account balance unchanged after adding planned transaction
- ✅ Balance on Accounts page unchanged
- ✅ Balance on Dashboard unchanged
- ✅ Planned transaction visible in transaction list but marked as "Planned"

**Pass Criteria:** Current balance remains unchanged by planned transactions

---

### Test Case 3.3: Convert Planned to Completed
**Objective:** Verify planned transactions can be marked as completed

**Steps:**
1. Create planned transaction (from Test Case 3.1)
2. Note current account balance
3. Find the planned transaction in list
4. Click "Mark as Paid" or similar action
5. Confirm the action
6. Check transaction status
7. Check account balance

**Expected Results:**
- ✅ "Mark as Paid" button/action visible on planned transactions
- ✅ Transaction status changes from "Planned" to "Completed"
- ✅ Visual indicator changes (badge removed or changed)
- ✅ Account balance NOW reflects the transaction
- ✅ Transaction date updated to completion date

**Pass Criteria:** Planned transaction successfully converted, balance updated

---

### Test Case 3.4: Planned Transaction - Reconciliation Excluded
**Objective:** Verify planned transactions don't affect reconciliation

**Steps:**
1. Create account with initial balance: 5000
2. Add completed transaction: -500 (balance should be 4500)
3. Add planned transaction: -1000 (balance should still be 4500)
4. Navigate to account reconciliation
5. Check reconciliation calculation

**Expected Results:**
- ✅ Reconciliation shows balance as 4500 (not 3500)
- ✅ Planned transaction not included in reconciliation calculation
- ✅ Only completed transactions affect reconciliation

**Pass Criteria:** Reconciliation excludes planned transactions

---


## Test Suite 4: Month-Based Navigation (AC 2.4.x)

### Test Case 4.1: Month Selector - Default Current Month
**Objective:** Verify month selector defaults to current month

**Steps:**
1. Navigate to Transactions page
2. Observe month selector at top of page

**Expected Results:**
- ✅ Month selector visible at top of page
- ✅ Shows current month and year (e.g., "February 2026")
- ✅ Shows transaction count for current month

**Pass Criteria:** Month selector defaults to current month with count

---

### Test Case 4.2: Month Selector - Change Month
**Objective:** Verify users can select different months

**Steps:**
1. Navigate to Transactions page
2. Click month selector dropdown
3. Select previous month
4. Observe transaction list
5. Select next month
6. Observe transaction list
7. Select future month (3 months ahead)
8. Observe transaction list

**Expected Results:**
- ✅ Dropdown shows list of months (past and future up to 6 months)
- ✅ Each month shows transaction count
- ✅ Transaction list filters immediately when month selected
- ✅ Only transactions from selected month visible
- ✅ URL updates to reflect selected month (for bookmarking)

**Pass Criteria:** Month selection filters transactions correctly

---

### Test Case 4.3: Month Navigation - Previous/Next Buttons
**Objective:** Verify quick navigation with arrow buttons

**Steps:**
1. Navigate to Transactions page (current month)
2. Click "Previous Month" button
3. Observe month selector and transaction list
4. Click "Next Month" button twice
5. Observe month selector and transaction list

**Expected Results:**
- ✅ Previous/Next buttons visible near month selector
- ✅ Previous button navigates to previous month
- ✅ Next button navigates to next month
- ✅ Transaction list updates with each navigation
- ✅ Month selector shows correct month after navigation

**Pass Criteria:** Arrow buttons navigate months correctly

---

### Test Case 4.4: Month Navigation - "Current Month" Quick Jump
**Objective:** Verify quick return to current month

**Steps:**
1. Navigate to Transactions page
2. Select month 3 months in past
3. Click "Current Month" or "Today" button
4. Observe month selector

**Expected Results:**
- ✅ "Current Month" or "Today" button visible
- ✅ Clicking button returns to current month
- ✅ Transaction list shows current month transactions

**Pass Criteria:** Quick jump to current month works

---


## Test Suite 5: Daily Cash Flow Forecast (AC 2.5.x) - CRITICAL P0

### Test Case 5.1: Forecast - Insufficient Data Message
**Objective:** Verify forecast shows helpful message when insufficient data

**Steps:**
1. Create fresh account with initial balance: 10,000
2. Add only 5 completed transactions (less than 14 days of data)
3. Navigate to Dashboard
4. Look for forecast widget

**Expected Results:**
- ✅ Forecast widget visible but shows "insufficient data" message
- ✅ Message explains need for at least 14 days of transaction history
- ✅ Message encourages adding more transactions
- ✅ No forecast chart displayed (low confidence hidden)
- ✅ Helpful guidance on what data is needed

**Pass Criteria:** Clear messaging when insufficient data, no misleading forecast shown

---

### Test Case 5.2: Forecast - Sufficient Data Display
**Objective:** Verify forecast displays when sufficient historical data exists

**Preparation:**
1. Create account with initial balance: 10,000
2. Add 20+ completed transactions over past 14+ days:
   - Mix of expenses (groceries, utilities, entertainment)
   - Amounts between 50-500
   - Spread across different days
3. Add 2-3 planned transactions for next 7 days

**Steps:**
1. Navigate to Dashboard
2. Locate Daily Forecast Chart widget
3. Observe chart display

**Expected Results:**
- ✅ Forecast chart visible showing daily projected balances
- ✅ Chart shows current month by default
- ✅ Each day has a projected balance point
- ✅ Chart uses color coding:
  - Green for safe days (balance above threshold)
  - Yellow for warning days (balance tight)
  - Red for danger days (balance below zero or critical)
- ✅ Summary stats visible: "X safe days, Y warning days, Z danger days"
- ✅ Smooth line connecting daily projections

**Pass Criteria:** Forecast chart displays with proper color coding and summary

---

### Test Case 5.3: Forecast - Calculation Accuracy
**Objective:** Verify forecast calculations are conservative and accurate

**Preparation:**
1. Account balance: 5,000
2. Historical data (last 14 days):
   - Daily expenses averaging 100/day (total 1,400)
3. Planned transactions:
   - Day 5: -500 (rent)
   - Day 10: +2,000 (income)
   - Day 15: -300 (utility)

**Steps:**
1. Navigate to Dashboard
2. View forecast chart
3. Hover over specific days to see breakdown
4. Verify calculations manually:
   - Day 1: 5,000 - (100 × 1.1) = ~4,890
   - Day 5: Previous - 500 - (100 × 1.1) = ~4,390
   - Day 10: Previous + 2,000 - (100 × 1.1) = ~6,390
   - Day 15: Previous - 300 - (100 × 1.1) = ~6,090

**Expected Results:**
- ✅ Forecast applies 10% conservative multiplier (110/day not 100/day)
- ✅ Planned transactions included on correct dates
- ✅ Running balance calculation accurate
- ✅ Tooltip shows breakdown: starting balance, planned income/expenses, estimated spending
- ✅ Calculations match manual verification (within rounding)

**Pass Criteria:** Forecast calculations accurate with conservative estimates

---

### Test Case 5.4: Forecast - Risk Level Indicators
**Objective:** Verify risk levels calculated correctly

**Preparation:**
1. Account balance: 1,000
2. Average daily spending: 100/day
3. Planned expense Day 5: -800

**Steps:**
1. Navigate to Dashboard
2. View forecast chart
3. Observe color coding for Day 5 and after

**Expected Results:**
- ✅ Days 1-4: Green (safe - balance above 7-day buffer)
- ✅ Day 5: Yellow or Red (balance drops significantly after -800)
- ✅ Days 6+: Red if balance below zero, Yellow if below 7-day buffer
- ✅ Risk thresholds:
  - Danger: Balance < 0
  - Warning: Balance < (average daily spending × 7 days)
  - Safe: Balance >= warning threshold

**Pass Criteria:** Risk levels accurately reflect projected financial safety

---

### Test Case 5.5: Forecast - Real-Time Updates
**Objective:** Verify forecast updates when transactions change

**Steps:**
1. View current forecast on Dashboard
2. Add new planned transaction for next week: -500
3. Return to Dashboard (or refresh)
4. Observe forecast chart

**Expected Results:**
- ✅ Forecast chart updates to reflect new planned transaction
- ✅ Projected balances recalculated for affected days
- ✅ Risk levels may change based on new transaction
- ✅ Update happens within 5 minutes (cache TTL)

**Pass Criteria:** Forecast reflects transaction changes

---

### Test Case 5.6: Forecast - Different Month Selection
**Objective:** Verify forecast can show different months

**Steps:**
1. View forecast for current month
2. Change month selector to next month
3. Observe forecast chart
4. Change to previous month
5. Observe forecast chart

**Expected Results:**
- ✅ Forecast chart updates for selected month
- ✅ Shows projections for all days in selected month
- ✅ Future months show more planned transactions
- ✅ Past months show actual completed transactions
- ✅ Confidence may decrease for distant future months

**Pass Criteria:** Forecast adapts to selected month

---

### Test Case 5.7: Forecast - Excludes Large One-Time Purchases
**Objective:** Verify large purchases don't skew daily average

**Preparation:**
1. Add 14 days of regular expenses: 50-100 each
2. Add one large purchase: 2,000 (car repair)
3. Average should be ~75/day, not ~200/day

**Steps:**
1. Navigate to Dashboard
2. View forecast chart
3. Hover over future days to see estimated daily spending

**Expected Results:**
- ✅ Estimated daily spending around 75-100 (not 200+)
- ✅ Large purchase (>2x median) excluded from average
- ✅ Forecast remains realistic for normal spending
- ✅ Tooltip or info shows data quality metrics

**Pass Criteria:** Large one-time purchases excluded from daily average

---


## Test Suite 6: Upcoming Payments & Risks Widget (AC 2.6.x) - CRITICAL P0

### Test Case 6.1: Upcoming Payments - Display
**Objective:** Verify upcoming payments widget shows planned transactions

**Preparation:**
1. Add planned transactions:
   - Day 3: -200 (Electricity)
   - Day 7: -500 (Rent)
   - Day 14: -100 (Internet)
   - Day 25: -300 (Insurance)

**Steps:**
1. Navigate to Dashboard
2. Locate "Upcoming Payments" widget
3. Observe list of payments

**Expected Results:**
- ✅ Widget shows all planned transactions for next 30 days
- ✅ Payments sorted by date (soonest first)
- ✅ Each payment shows:
  - Description
  - Amount
  - Days until payment (e.g., "in 3 days")
  - Risk indicator (🟢🟡🔴)
- ✅ Total upcoming expenses shown (7-day, 14-day, 30-day)

**Pass Criteria:** All upcoming planned transactions visible with details

---

### Test Case 6.2: Payment Risk - Safe (Green)
**Objective:** Verify safe payments show green indicator

**Preparation:**
1. Account balance: 10,000
2. Average daily spending: 100/day
3. Planned payment Day 5: -200

**Steps:**
1. Navigate to Dashboard
2. View Upcoming Payments widget
3. Observe risk indicator for Day 5 payment

**Expected Results:**
- ✅ Payment shows green indicator (🟢)
- ✅ Tooltip/message: "Sufficient funds available"
- ✅ Shows projected balance after payment
- ✅ Balance after payment well above safety buffer

**Pass Criteria:** Safe payments clearly marked green

---

### Test Case 6.3: Payment Risk - Warning (Yellow)
**Objective:** Verify tight balance shows yellow warning

**Preparation:**
1. Account balance: 1,500
2. Average daily spending: 100/day
3. Planned payment Day 5: -800

**Steps:**
1. Navigate to Dashboard
2. View Upcoming Payments widget
3. Observe risk indicator for Day 5 payment

**Expected Results:**
- ✅ Payment shows yellow indicator (🟡)
- ✅ Warning message: "Balance will be tight"
- ✅ Shows projected balance after payment
- ✅ Balance after payment below 7-day safety buffer but above zero
- ✅ Recommendation shown (e.g., "Consider postponing non-essential expenses")

**Pass Criteria:** Warning payments clearly marked yellow with helpful message

---

### Test Case 6.4: Payment Risk - Danger (Red)
**Objective:** Verify insufficient funds shows red danger

**Preparation:**
1. Account balance: 500
2. Average daily spending: 100/day
3. Planned payment Day 5: -800

**Steps:**
1. Navigate to Dashboard
2. View Upcoming Payments widget
3. Observe risk indicator for Day 5 payment

**Expected Results:**
- ✅ Payment shows red indicator (🔴)
- ✅ Danger message: "Insufficient funds"
- ✅ Shows amount needed (e.g., "Need ₴300 more")
- ✅ Clear warning that payment cannot be made
- ✅ Recommendation to add funds or postpone

**Pass Criteria:** Danger payments clearly marked red with specific shortfall amount

---

### Test Case 6.5: Mark Payment as Paid
**Objective:** Verify planned payment can be marked as completed

**Preparation:**
1. Create planned payment for tomorrow: -200

**Steps:**
1. Navigate to Dashboard
2. Locate payment in Upcoming Payments widget
3. Click "Mark as Paid" button
4. Confirm action
5. Observe changes

**Expected Results:**
- ✅ "Mark as Paid" button visible on each payment
- ✅ Confirmation dialog appears (optional)
- ✅ Payment removed from upcoming list
- ✅ Payment now appears in transaction list as "Completed"
- ✅ Account balance updated to reflect payment
- ✅ Forecast chart updates automatically

**Pass Criteria:** Payment successfully converted to completed, balance updated

---

### Test Case 6.6: Payment Totals
**Objective:** Verify total upcoming expenses calculated correctly

**Preparation:**
1. Planned payments:
   - Day 3: -200
   - Day 7: -500
   - Day 14: -100
   - Day 25: -300

**Steps:**
1. Navigate to Dashboard
2. View Upcoming Payments widget
3. Observe total sections

**Expected Results:**
- ✅ Next 7 days total: ₴700 (200 + 500)
- ✅ Next 14 days total: ₴800 (200 + 500 + 100)
- ✅ Next 30 days total: ₴1,100 (all payments)
- ✅ Totals clearly labeled and visible
- ✅ Totals update when payments marked as paid

**Pass Criteria:** Totals accurately sum upcoming payments by timeframe

---


## Test Suite 7: Balance Overview Widget (AC 2.7.x) - P0

### Test Case 7.1: Total Balance Display
**Objective:** Verify total balance across all accounts shown

**Preparation:**
1. Create 3 accounts:
   - Checking: 5,000
   - Savings: 10,000
   - Credit Card: -2,000 (debt)

**Steps:**
1. Navigate to Dashboard
2. Locate Balance Overview widget
3. Observe total balance

**Expected Results:**
- ✅ Widget shows total balance: ₴13,000 (5,000 + 10,000 - 2,000)
- ✅ Total prominently displayed
- ✅ Clear label "Total Balance" or "Net Worth"

**Pass Criteria:** Total balance accurately sums all accounts

---

### Test Case 7.2: Account Breakdown
**Objective:** Verify individual account balances shown

**Steps:**
1. View Balance Overview widget (from Test Case 7.1)
2. Observe account list

**Expected Results:**
- ✅ All accounts listed individually
- ✅ Each account shows:
  - Account name
  - Current balance
  - Account type (checking, savings, credit, etc.)
- ✅ Accounts grouped or labeled by type
- ✅ Visual distinction between assets and debts

**Pass Criteria:** All accounts visible with accurate balances

---

### Test Case 7.3: Reconciliation Status Indicators
**Objective:** Verify accounts needing reconciliation are highlighted

**Preparation:**
1. Create account with initial balance: 5,000
2. Add transactions totaling -1,000
3. Don't reconcile (leave reconciliation pending)

**Steps:**
1. Navigate to Dashboard
2. View Balance Overview widget
3. Observe account status indicators

**Expected Results:**
- ✅ Account shows reconciliation status indicator
- ✅ Visual indicator (icon, badge, color) for needs reconciliation
- ✅ Tooltip or message explaining reconciliation needed
- ✅ Quick link to reconcile account

**Pass Criteria:** Reconciliation status clearly visible

---

### Test Case 7.4: Quick Reconciliation Link
**Objective:** Verify quick access to reconciliation

**Steps:**
1. View Balance Overview widget
2. Find account needing reconciliation
3. Click reconciliation link/button
4. Observe navigation

**Expected Results:**
- ✅ "Reconcile" button/link visible on accounts needing it
- ✅ Clicking navigates to reconciliation page/modal
- ✅ Account pre-selected for reconciliation
- ✅ Easy return to dashboard after reconciliation

**Pass Criteria:** Quick reconciliation access works

---

### Test Case 7.5: Debt vs Asset Separation
**Objective:** Verify clear distinction between assets and debts

**Preparation:**
1. Accounts:
   - Checking: 3,000 (asset)
   - Savings: 7,000 (asset)
   - Credit Card: -2,000 (debt)
   - Loan: -5,000 (debt)

**Steps:**
1. Navigate to Dashboard
2. View Balance Overview widget
3. Observe account grouping

**Expected Results:**
- ✅ Assets grouped together (total: ₴10,000)
- ✅ Debts grouped together (total: -₴7,000)
- ✅ Clear visual separation (sections, colors, labels)
- ✅ Net balance shown: ₴3,000
- ✅ Positive balances in green/growth color
- ✅ Negative balances in red/warning color

**Pass Criteria:** Clear asset/debt separation with accurate totals

---


## Test Suite 8: Spending Trends Analysis (AC 2.8.x) - P1

### Test Case 8.1: Category Spending Display
**Objective:** Verify spending by category shown for selected month

**Preparation:**
1. Add transactions for current month:
   - Groceries: 5 transactions totaling 1,500
   - Utilities: 3 transactions totaling 800
   - Entertainment: 4 transactions totaling 600
   - Transport: 6 transactions totaling 400

**Steps:**
1. Navigate to Dashboard
2. Locate Spending Trends widget
3. Observe category breakdown

**Expected Results:**
- ✅ Widget shows spending by category
- ✅ Categories sorted by amount (highest first)
- ✅ Each category shows:
  - Category name
  - Total amount spent
  - Percentage of total spending
- ✅ Visual representation (chart, bars, or list)
- ✅ Top 3 categories highlighted or emphasized

**Pass Criteria:** Category spending clearly displayed and sorted

---

### Test Case 8.2: Month-over-Month Comparison
**Objective:** Verify comparison to previous month shown

**Preparation:**
1. Previous month transactions:
   - Groceries: 1,200
   - Utilities: 800
   - Entertainment: 800
2. Current month transactions:
   - Groceries: 1,500 (+25%)
   - Utilities: 800 (0%)
   - Entertainment: 600 (-25%)

**Steps:**
1. View Spending Trends widget
2. Observe percentage changes

**Expected Results:**
- ✅ Each category shows % change from previous month
- ✅ Groceries: +25% (increasing)
- ✅ Utilities: 0% (stable)
- ✅ Entertainment: -25% (decreasing)
- ✅ Visual indicators:
  - ↑ for increasing
  - → for stable
  - ↓ for decreasing
- ✅ Color coding: red for increases, green for decreases

**Pass Criteria:** Month-over-month changes accurate with visual indicators

---

### Test Case 8.3: Three-Month Average Comparison
**Objective:** Verify comparison to 3-month average

**Preparation:**
1. Month -3: Groceries 1,000
2. Month -2: Groceries 1,200
3. Month -1: Groceries 1,100
4. Current: Groceries 1,500
5. 3-month average: 1,100

**Steps:**
1. View Spending Trends widget
2. Observe 3-month average comparison

**Expected Results:**
- ✅ Shows 3-month average: ₴1,100
- ✅ Shows current month: ₴1,500
- ✅ Shows difference: +₴400 or +36%
- ✅ Indicates if current spending is above/below average

**Pass Criteria:** 3-month average calculated and compared correctly

---

### Test Case 8.4: Unusual Spending Detection
**Objective:** Verify unusual spending patterns highlighted

**Preparation:**
1. 3-month average for Entertainment: 400
2. Current month Entertainment: 1,200 (3x average)

**Steps:**
1. View Spending Trends widget
2. Look for unusual spending indicators

**Expected Results:**
- ✅ Entertainment category marked as "unusual"
- ✅ Visual indicator (icon, badge, highlight)
- ✅ Explanation: "200% above 3-month average"
- ✅ Threshold: >50% deviation from average
- ✅ Helps user identify spending anomalies

**Pass Criteria:** Unusual spending clearly flagged

---

### Test Case 8.5: Average Daily Spending
**Objective:** Verify average daily spending calculated

**Preparation:**
1. Current month (30 days)
2. Total expenses: 3,000
3. Expected average: 100/day

**Steps:**
1. View Spending Trends widget
2. Locate average daily spending metric

**Expected Results:**
- ✅ Shows "Average Daily Spending: ₴100"
- ✅ Calculation: Total expenses / days in month
- ✅ Excludes large one-time purchases (if applicable)
- ✅ Used in forecast calculations

**Pass Criteria:** Average daily spending accurate

---

### Test Case 8.6: Trend Direction Indicators
**Objective:** Verify trend indicators show spending direction

**Preparation:**
1. Category with increasing trend (3 months: 500, 600, 700)
2. Category with decreasing trend (3 months: 700, 600, 500)
3. Category with stable trend (3 months: 500, 500, 500)

**Steps:**
1. View Spending Trends widget
2. Observe trend indicators for each category

**Expected Results:**
- ✅ Increasing: ↑ arrow, red/warning color
- ✅ Decreasing: ↓ arrow, green/success color
- ✅ Stable: → arrow, neutral color
- ✅ Threshold: >5% change = increasing/decreasing
- ✅ Clear visual distinction between trends

**Pass Criteria:** Trend directions accurately indicated

---


## Test Suite 9: User Experience & Polish

### Test Case 9.1: Dashboard Layout - Responsive
**Objective:** Verify dashboard widgets display properly on all screen sizes

**Steps:**
1. Navigate to Dashboard on desktop (1920x1080)
2. Observe widget layout
3. Resize browser to tablet size (768x1024)
4. Observe widget layout
5. Resize to mobile size (375x667)
6. Observe widget layout

**Expected Results:**
- ✅ Desktop: Widgets in grid layout (2-3 columns)
- ✅ Tablet: Widgets in 1-2 columns
- ✅ Mobile: Widgets stacked vertically (1 column)
- ✅ All widgets readable and functional at all sizes
- ✅ Charts scale appropriately
- ✅ No horizontal scrolling required
- ✅ Touch targets adequate on mobile (44px minimum)

**Pass Criteria:** Dashboard responsive and usable on all screen sizes

---

### Test Case 9.2: Loading States
**Objective:** Verify loading indicators shown during data fetch

**Steps:**
1. Navigate to Dashboard
2. Observe initial load
3. Change month selection
4. Observe loading state
5. Add new transaction
6. Return to Dashboard
7. Observe refresh

**Expected Results:**
- ✅ Skeleton loaders shown while data loading
- ✅ Loading indicators match Executive Lounge aesthetic
- ✅ No blank screens or broken layouts during load
- ✅ Smooth transitions from loading to loaded state
- ✅ Loading time < 3 seconds for dashboard

**Pass Criteria:** Professional loading states throughout

---

### Test Case 9.3: Empty States
**Objective:** Verify helpful empty states when no data

**Steps:**
1. Create new account with no transactions
2. Navigate to Dashboard
3. Observe each widget

**Expected Results:**
- ✅ Forecast widget: "Add transactions to see forecast"
- ✅ Upcoming Payments: "No upcoming payments scheduled"
- ✅ Spending Trends: "Add transactions to see trends"
- ✅ Each empty state includes:
  - Clear explanation
  - Call-to-action button
  - Helpful guidance
- ✅ No broken UI or error messages

**Pass Criteria:** Empty states helpful and actionable

---

### Test Case 9.4: Error Handling
**Objective:** Verify graceful error handling

**Steps:**
1. Disconnect internet
2. Navigate to Dashboard
3. Observe error states
4. Reconnect internet
5. Observe recovery

**Expected Results:**
- ✅ Error messages user-friendly (not technical)
- ✅ Retry buttons available
- ✅ Partial data shown if available
- ✅ No app crashes
- ✅ Automatic recovery when connection restored
- ✅ Error boundaries prevent full page crashes

**Pass Criteria:** Errors handled gracefully with recovery options

---

### Test Case 9.5: Performance - Dashboard Load Time
**Objective:** Verify dashboard loads within performance targets

**Steps:**
1. Clear browser cache
2. Navigate to Dashboard
3. Measure load time (use browser DevTools)
4. Repeat with cached data

**Expected Results:**
- ✅ Initial load (no cache): < 3 seconds
- ✅ Subsequent loads (cached): < 1 second
- ✅ Forecast calculation: < 2 seconds
- ✅ No UI blocking during calculations
- ✅ Smooth animations and transitions

**Pass Criteria:** Performance meets targets

---

### Test Case 9.6: Accessibility - Keyboard Navigation
**Objective:** Verify full keyboard accessibility

**Steps:**
1. Navigate to Dashboard using only keyboard (Tab key)
2. Navigate through all widgets
3. Interact with month selector using keyboard
4. Mark payment as paid using keyboard
5. Navigate to transaction form using keyboard

**Expected Results:**
- ✅ All interactive elements reachable via Tab
- ✅ Focus indicators visible (outline, glow)
- ✅ Logical tab order (top to bottom, left to right)
- ✅ Enter/Space activates buttons
- ✅ Arrow keys work in dropdowns
- ✅ Escape closes modals/dropdowns
- ✅ No keyboard traps

**Pass Criteria:** Full keyboard accessibility

---

### Test Case 9.7: Accessibility - Screen Reader
**Objective:** Verify screen reader compatibility

**Steps:**
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to Dashboard
3. Listen to widget announcements
4. Navigate through forecast chart
5. Interact with upcoming payments

**Expected Results:**
- ✅ All widgets have descriptive labels
- ✅ Chart data announced meaningfully
- ✅ Risk indicators announced (safe/warning/danger)
- ✅ Button purposes clear
- ✅ Form fields properly labeled
- ✅ Error messages announced
- ✅ Loading states announced

**Pass Criteria:** Screen reader users can understand and use all features

---

### Test Case 9.8: Visual Design - Executive Lounge Aesthetic
**Objective:** Verify design matches Executive Lounge aesthetic

**Steps:**
1. Navigate to Dashboard
2. Observe visual design elements
3. Check dark mode
4. Check light mode (if available)

**Expected Results:**
- ✅ Glass card effects (backdrop-blur, translucent backgrounds)
- ✅ Warm color palette (Single Malt Gold, Growth Emerald)
- ✅ Generous spacing (luxury feel)
- ✅ Smooth rounded corners (20px+)
- ✅ Colored shadows (not pure black/gray)
- ✅ Ambient glow effect (top-right warm glow)
- ✅ Typography: Space Grotesk for headings, Inter for body
- ✅ Consistent with rest of application

**Pass Criteria:** Design matches Executive Lounge aesthetic throughout

---


## Test Suite 10: Complete User Journey - End-to-End

### Test Case 10.1: Complete New User Journey
**Objective:** Verify complete user journey from signup to forecast viewing

**Steps:**
1. **Registration**
   - Go to signup page
   - Register with new email
   - Verify email
   - Login

2. **Workspace Creation**
   - See workspace creation prompt
   - Create workspace "My Family Budget"
   - Confirm workspace created

3. **Account Creation**
   - Navigate to Accounts
   - Create checking account: "Main Checking", balance: 10,000
   - Create savings account: "Emergency Fund", balance: 5,000

4. **Historical Transactions** (Build 14+ days of data)
   - Add 20 completed transactions over past 14 days:
     - Groceries: 5 transactions (100-200 each)
     - Utilities: 2 transactions (300-500 each)
     - Entertainment: 4 transactions (50-150 each)
     - Transport: 5 transactions (30-80 each)
     - Misc: 4 transactions (20-100 each)
   - Spread across different days

5. **Planned Transactions**
   - Add planned transaction: Day 5, -500, "Rent"
   - Add planned transaction: Day 10, +2000, "Salary"
   - Add planned transaction: Day 15, -200, "Utilities"

6. **View Dashboard**
   - Navigate to Dashboard
   - Observe all widgets

7. **Interact with Forecast**
   - View daily forecast chart
   - Hover over different days
   - Check risk indicators

8. **Manage Upcoming Payments**
   - View upcoming payments widget
   - Check risk levels
   - Mark one payment as paid

9. **Analyze Spending**
   - View spending trends
   - Check category breakdown
   - Observe month-over-month changes

**Expected Results:**
- ✅ Smooth onboarding flow with clear guidance
- ✅ All widgets display with real data
- ✅ Forecast shows 14+ days of projections
- ✅ Risk indicators accurate
- ✅ Upcoming payments sorted and color-coded
- ✅ Spending trends show category breakdown
- ✅ No errors or broken states
- ✅ User feels confident and in control

**Pass Criteria:** Complete journey successful, user understands financial position

---

### Test Case 10.2: Daily Usage Scenario
**Objective:** Verify typical daily user workflow

**Steps:**
1. **Morning Check**
   - Login to app
   - View Dashboard
   - Check today's projected balance
   - Review upcoming payments for next 7 days

2. **Add Today's Expense**
   - Navigate to Transactions
   - Add expense: -45, "Lunch"
   - Return to Dashboard
   - Verify forecast updated

3. **Plan Future Expense**
   - Add planned transaction: Next week, -150, "Dinner reservation"
   - Check upcoming payments widget
   - Verify new payment appears with risk indicator

4. **Mark Payment as Completed**
   - Find payment due today in upcoming payments
   - Mark as paid
   - Verify balance updated
   - Verify payment removed from upcoming list

5. **Review Spending**
   - Check spending trends
   - Identify highest spending category
   - Note any unusual spending

**Expected Results:**
- ✅ Dashboard loads quickly (< 1 second cached)
- ✅ All actions complete smoothly
- ✅ Real-time updates visible
- ✅ User can complete daily tasks in < 2 minutes
- ✅ Clear financial visibility maintained

**Pass Criteria:** Daily workflow efficient and informative

---

### Test Case 10.3: Financial Planning Scenario
**Objective:** Verify user can plan for large upcoming expense

**Scenario:** User needs to pay 3,000 for car insurance in 2 weeks

**Steps:**
1. **Check Current Position**
   - View Dashboard
   - Note current balance: 5,000
   - Note average daily spending: 150/day

2. **Add Planned Expense**
   - Add planned transaction: Day 14, -3,000, "Car Insurance"
   - Return to Dashboard

3. **Assess Risk**
   - View forecast chart
   - Check Day 14 and beyond
   - Observe risk indicators
   - Expected: Yellow or Red (balance tight after payment)

4. **View Recommendation**
   - Check upcoming payments widget
   - Read risk assessment for insurance payment
   - Note recommendation

5. **Plan Solution**
   - Option A: Add planned income before Day 14
   - Option B: Reduce spending in coming days
   - Option C: Postpone payment

6. **Implement Plan**
   - Add planned income: Day 10, +2,000, "Freelance payment"
   - Return to Dashboard
   - Verify forecast improved
   - Verify insurance payment now shows green/yellow

**Expected Results:**
- ✅ User can see financial impact of large expense
- ✅ Risk clearly communicated
- ✅ Recommendations helpful
- ✅ User can model solutions
- ✅ Forecast updates reflect planning
- ✅ User feels prepared and in control

**Pass Criteria:** User successfully plans for large expense using forecast

---


## Test Suite 11: Edge Cases & Data Integrity

### Test Case 11.1: Zero Balance Scenario
**Objective:** Verify app handles zero/negative balance gracefully

**Steps:**
1. Create account with balance: 100
2. Add expense: -150 (creates negative balance)
3. View Dashboard
4. Check forecast

**Expected Results:**
- ✅ Negative balance displayed clearly
- ✅ Forecast shows danger indicators
- ✅ Upcoming payments all show red risk
- ✅ Clear messaging about insufficient funds
- ✅ No calculation errors
- ✅ App remains functional

**Pass Criteria:** Negative balance handled gracefully

---

### Test Case 11.2: No Planned Transactions
**Objective:** Verify forecast works with only historical data

**Steps:**
1. Create account with 14+ days of completed transactions
2. Don't add any planned transactions
3. View Dashboard
4. Check forecast and upcoming payments

**Expected Results:**
- ✅ Forecast shows projections based on average spending only
- ✅ Upcoming payments widget shows "No upcoming payments"
- ✅ Forecast still useful (shows spending trajectory)
- ✅ No errors or broken states

**Pass Criteria:** Forecast works without planned transactions

---

### Test Case 11.3: Many Planned Transactions
**Objective:** Verify app handles large number of planned transactions

**Steps:**
1. Add 50+ planned transactions spread over next 6 months
2. View Dashboard
3. Check upcoming payments widget
4. Check forecast chart

**Expected Results:**
- ✅ Upcoming payments shows next 30 days only
- ✅ Widget scrollable if many payments
- ✅ Forecast chart not cluttered
- ✅ Performance remains good (< 2 seconds)
- ✅ All calculations accurate

**Pass Criteria:** Large number of planned transactions handled well

---

### Test Case 11.4: Date Boundary - Month End
**Objective:** Verify forecast handles month boundaries correctly

**Steps:**
1. Test on last day of month
2. View forecast for current month
3. Switch to next month
4. Verify calculations

**Expected Results:**
- ✅ Current month shows all days including today
- ✅ Next month starts from day 1
- ✅ No duplicate or missing days
- ✅ Running balance carries over correctly
- ✅ Month selector handles transition smoothly

**Pass Criteria:** Month boundaries handled correctly

---

### Test Case 11.5: Maximum Date Range (6 Months)
**Objective:** Verify 6-month limit enforced

**Steps:**
1. Try to add planned transaction 7 months in future
2. Try to add planned transaction exactly 6 months in future
3. View forecast for month 6 months ahead

**Expected Results:**
- ✅ Date picker prevents selecting > 6 months ahead
- ✅ 6 months ahead allowed
- ✅ Error message if trying to exceed limit
- ✅ Forecast shows low confidence for distant months
- ✅ Limit clearly communicated to user

**Pass Criteria:** 6-month limit enforced consistently

---

### Test Case 11.6: Multiple Accounts - Forecast
**Objective:** Verify forecast works with multiple accounts

**Steps:**
1. Create 3 accounts with different balances
2. Add transactions to different accounts
3. Add planned transactions to different accounts
4. View Dashboard

**Expected Results:**
- ✅ Forecast combines all accounts
- ✅ Total balance shown
- ✅ Planned transactions from all accounts included
- ✅ Can filter forecast by specific account (if feature exists)
- ✅ Calculations accurate across accounts

**Pass Criteria:** Multi-account forecast accurate

---

### Test Case 11.7: Transaction Edit - Forecast Update
**Objective:** Verify forecast updates when transaction edited

**Steps:**
1. View current forecast
2. Edit planned transaction amount (500 → 1000)
3. Return to Dashboard
4. Check forecast

**Expected Results:**
- ✅ Forecast recalculates with new amount
- ✅ Risk levels may change
- ✅ Update visible within cache TTL (5 minutes)
- ✅ No stale data shown

**Pass Criteria:** Edits reflected in forecast

---

### Test Case 11.8: Transaction Delete - Forecast Update
**Objective:** Verify forecast updates when transaction deleted

**Steps:**
1. View current forecast with planned transaction
2. Delete the planned transaction
3. Return to Dashboard
4. Check forecast and upcoming payments

**Expected Results:**
- ✅ Deleted transaction removed from forecast
- ✅ Deleted transaction removed from upcoming payments
- ✅ Forecast recalculates without transaction
- ✅ Balance projections updated

**Pass Criteria:** Deletions reflected in forecast

---


## Test Suite 12: User Settings & Customization

### Test Case 12.1: User Settings - Minimum Safe Balance
**Objective:** Verify user can set custom minimum safe balance

**Steps:**
1. Navigate to Settings
2. Find forecast/safety settings section
3. Set minimum safe balance: 2,000
4. Save settings
5. Return to Dashboard
6. View forecast risk indicators

**Expected Results:**
- ✅ Settings page has forecast preferences section
- ✅ Minimum safe balance field accepts numeric input
- ✅ Settings save successfully
- ✅ Forecast risk thresholds update:
  - Danger: Balance < 2,000 (user-defined)
  - Warning: Balance < 2,000 + (7 days × avg spending)
- ✅ Risk indicators reflect new threshold

**Pass Criteria:** Custom minimum safe balance applied to forecast

---

### Test Case 12.2: User Settings - Safety Buffer Days
**Objective:** Verify user can customize safety buffer period

**Steps:**
1. Navigate to Settings
2. Set safety buffer days: 14 (instead of default 7)
3. Save settings
4. Return to Dashboard
5. View forecast risk indicators

**Expected Results:**
- ✅ Safety buffer days field accepts 1-30 days
- ✅ Settings save successfully
- ✅ Warning threshold now: avg daily spending × 14 days
- ✅ More days show yellow warning (larger buffer)
- ✅ Risk calculations reflect new buffer

**Pass Criteria:** Custom safety buffer applied to risk calculations

---

### Test Case 12.3: Settings Persistence
**Objective:** Verify settings persist across sessions

**Steps:**
1. Set custom minimum safe balance: 3,000
2. Set safety buffer days: 10
3. Save settings
4. Logout
5. Login again
6. Navigate to Settings
7. Check saved values

**Expected Results:**
- ✅ Settings values preserved after logout
- ✅ Settings form shows saved values
- ✅ Forecast continues using saved settings
- ✅ Settings tied to user account (not browser)

**Pass Criteria:** Settings persist across sessions

---

## Test Suite 13: Performance & Reliability

### Test Case 13.1: Cache Behavior
**Objective:** Verify forecast caching works correctly

**Steps:**
1. View Dashboard (fresh load)
2. Note load time
3. Navigate away
4. Return to Dashboard within 5 minutes
5. Note load time
6. Wait 6 minutes
7. Return to Dashboard
8. Note load time

**Expected Results:**
- ✅ First load: Calculates forecast (1-2 seconds)
- ✅ Second load (< 5 min): Instant (cached)
- ✅ Third load (> 5 min): Recalculates (cache expired)
- ✅ Cache TTL: 5 minutes
- ✅ No stale data shown

**Pass Criteria:** Caching improves performance without showing stale data

---

### Test Case 13.2: Large Dataset Performance
**Objective:** Verify performance with large transaction history

**Preparation:**
1. Create 500+ completed transactions over 6 months
2. Create 50+ planned transactions

**Steps:**
1. Navigate to Dashboard
2. Measure load time
3. Change month selection
4. Measure response time
5. View forecast chart
6. Interact with widgets

**Expected Results:**
- ✅ Dashboard loads in < 3 seconds
- ✅ Month switching < 500ms
- ✅ Forecast calculation < 2 seconds
- ✅ No UI freezing or blocking
- ✅ Smooth scrolling and interactions
- ✅ Charts render without lag

**Pass Criteria:** Performance acceptable with large dataset

---

### Test Case 13.3: Concurrent User Actions
**Objective:** Verify app handles rapid user actions

**Steps:**
1. Rapidly switch between months (5 times quickly)
2. Add transaction while forecast loading
3. Mark payment as paid while viewing forecast
4. Edit transaction while dashboard refreshing

**Expected Results:**
- ✅ No race conditions or errors
- ✅ Latest action takes precedence
- ✅ No duplicate requests
- ✅ UI remains responsive
- ✅ Data consistency maintained
- ✅ No crashes or broken states

**Pass Criteria:** App handles concurrent actions gracefully

---


## Test Execution Checklist

### Before Starting Tests

- [ ] Local development server running (`npm run dev`)
- [ ] Browser DevTools open (for performance monitoring)
- [ ] Fresh test account or cleared test data
- [ ] Notepad ready for recording issues
- [ ] Screenshots tool ready for bug reports

### Test Execution Order

**Priority 1 - Critical Path (Must Pass):**
1. ✅ Test Suite 1: Guided Onboarding Journey
2. ✅ Test Suite 2: Access Control Consistency
3. ✅ Test Suite 3: Future Transaction Planning
4. ✅ Test Suite 5: Daily Cash Flow Forecast (CRITICAL)
5. ✅ Test Suite 6: Upcoming Payments & Risks (CRITICAL)
6. ✅ Test Suite 7: Balance Overview Widget

**Priority 2 - Important Features:**
7. ✅ Test Suite 4: Month-Based Navigation
8. ✅ Test Suite 8: Spending Trends Analysis
9. ✅ Test Suite 10: Complete User Journey

**Priority 3 - Polish & Edge Cases:**
10. ✅ Test Suite 9: User Experience & Polish
11. ✅ Test Suite 11: Edge Cases & Data Integrity
12. ✅ Test Suite 12: User Settings & Customization
13. ✅ Test Suite 13: Performance & Reliability

### Recording Results

For each test case, record:
- ✅ **PASS**: All expected results met
- ⚠️ **PARTIAL**: Some expected results met, minor issues
- ❌ **FAIL**: Expected results not met, blocking issue

**Issue Template:**
```
Test Case: [ID and Name]
Status: FAIL
Issue: [Brief description]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
Expected: [What should happen]
Actual: [What actually happened]
Screenshot: [Attach if applicable]
Priority: High/Medium/Low
```

### Success Criteria

**Minimum for Release:**
- All Priority 1 tests: PASS
- Priority 2 tests: 90% PASS
- Priority 3 tests: 80% PASS
- No critical bugs
- No data integrity issues
- Performance targets met

### Post-Testing

- [ ] Document all issues found
- [ ] Prioritize issues (Critical/High/Medium/Low)
- [ ] Create GitHub issues for bugs
- [ ] Update test cases if needed
- [ ] Share results with team
- [ ] Plan fixes for failed tests

---

## Quick Reference - Key Acceptance Criteria

### Onboarding (AC 2.1.x)
- No workspace → workspace prompt on all pages except settings
- Workspace but no accounts → account prompt on transactions page
- Settings always accessible

### Future Transactions (AC 2.3.x)
- Can add transactions up to 6 months ahead
- Planned transactions don't affect current balance
- Can convert planned to completed
- Visual distinction between planned and completed

### Forecast (AC 2.5.x) - CRITICAL
- Requires 14+ days of historical data
- Shows daily projected balance
- Color-coded risk levels (green/yellow/red)
- Conservative estimates (10% multiplier)
- Excludes large one-time purchases from average
- Updates in real-time

### Upcoming Payments (AC 2.6.x) - CRITICAL
- Shows next 30 days of planned transactions
- Risk indicators: 🟢 safe, 🟡 warning, 🔴 danger
- Sorted by date (soonest first)
- Can mark as paid
- Shows totals (7/14/30 days)

### Balance Overview (AC 2.7.x)
- Total balance across all accounts
- Account-level breakdown
- Reconciliation status indicators
- Debt vs. asset separation

### Spending Trends (AC 2.8.x)
- Spending by category
- Month-over-month comparison
- 3-month average comparison
- Unusual spending detection
- Trend indicators (↑↓→)

---

## Notes for Testers

1. **Take Your Time**: Each test suite takes 15-30 minutes
2. **Be Thorough**: Check all expected results, not just main functionality
3. **Think Like a User**: Does it make sense? Is it intuitive?
4. **Test Edge Cases**: Try to break it - enter weird data, rapid clicks, etc.
5. **Document Everything**: Screenshots help developers fix issues faster
6. **Focus on User Value**: Does this help users feel safe and in control?

---

## Estimated Testing Time

- **Priority 1 Tests**: 3-4 hours
- **Priority 2 Tests**: 2-3 hours  
- **Priority 3 Tests**: 2-3 hours
- **Total**: 7-10 hours for complete manual testing

**Recommendation**: Split testing across multiple sessions to maintain focus and accuracy.

---

## Contact for Issues

If you find critical issues during testing:
1. Stop testing that feature
2. Document the issue thoroughly
3. Report immediately (don't wait until end)
4. Continue with other test suites

---

**Happy Testing! 🚀**

Remember: The goal is to ensure users feel safe, prepared, and in control of their finances. Every test case validates that promise.

