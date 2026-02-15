# User Journey & Emotional Value Enhancement - Requirements

## 1. Overview

### 1.1 Feature Purpose
Transform Forma from a transaction tracking tool into a **financial safety and control system**. Users should feel safe, prepared, and in control by seeing their future financial position and avoiding payment failures.

### 1.2 Core Emotional Goals
- **Safety & Security**: User feels confident they won't run out of money
- **Future Visibility**: User sees exactly how much money they'll have each day
- **Risk Awareness**: User knows about upcoming payments and potential issues
- **Control & Preparedness**: User can plan ahead and avoid financial surprises

### 1.3 User Journey Philosophy
> "First create order (workspace), then structure (accounts), then track (transactions), then see the future (forecast)"

### 1.4 Key Value Proposition
**"Never be surprised by running out of money. See your future financial position every day."**

## 2. User Stories

### 2.1 Guided Onboarding Journey

**As a new user**
- I want to be guided through workspace → accounts → transactions setup
- So that I understand the proper order and don't feel lost

**Acceptance Criteria:**
- 2.1.1 User without workspace sees workspace creation prompt on ALL pages except settings
- 2.1.2 User with workspace but no accounts sees account creation prompt on transaction page
- 2.1.3 User with workspace and accounts can freely use all features
- 2.1.4 Settings page is accessible at all times (for theme, profile, etc.)
- 2.1.5 Each blocking state shows clear next action with single prominent button

### 2.2 Access Control Consistency

**As a user navigating the app**
- I want consistent access rules across all pages
- So that I understand what I can and cannot do

**Acceptance Criteria:**
- 2.2.1 Dashboard: Accessible always, shows onboarding if no workspace
- 2.2.2 Transactions: Requires workspace AND at least one account
- 2.2.3 Accounts: Requires workspace
- 2.2.4 Categories: Requires workspace (auto-created with workspace)
- 2.2.5 Reports: Requires workspace AND transactions
- 2.2.6 Settings: Always accessible (theme, profile, workspace management)

### 2.3 Future Transaction Planning

**As a user planning my finances**
- I want to enter future transactions that haven't happened yet
- So that I can plan for upcoming expenses and income

**Acceptance Criteria:**
- 2.3.1 Transaction form allows future dates (up to 6 months ahead)
- 2.3.2 Future transactions marked with "Planned" status
- 2.3.3 Future transactions don't affect current account balances
- 2.3.4 Future transactions don't affect reconciliation calculations
- 2.3.5 Future transactions can be converted to "Completed" when they occur
- 2.3.6 Visual distinction between planned and completed transactions

### 2.4 Month-Based Transaction Navigation

**As a user entering transactions daily**
- I want to work within a specific month context
- So that I can focus on current period without distraction

**Acceptance Criteria:**
- 2.4.1 Month selector dropdown at top of transaction page
- 2.4.2 Default to current month on page load
- 2.4.3 Can select any month (past or future up to 6 months)
- 2.4.4 Transaction list filters to selected month automatically
- 2.4.5 Quick navigation: Previous/Next month buttons
- 2.4.6 Month selector shows transaction count per month

### 2.5 Daily Cash Flow Forecast (CRITICAL - P0)

**As a user planning my finances**
- I want to see how much money I'll have available each day this month
- So that I feel safe and can avoid running out of money

**Acceptance Criteria:**
- 2.5.1 Dashboard shows daily forecast for selected month
- 2.5.2 Forecast calculation includes:
  - Current account balances (starting point)
  - Completed transactions (historical)
  - Planned/future transactions (scheduled)
  - Average daily spending pattern (learned from history)
  - Recurring transactions (if any)
- 2.5.3 Visual chart showing projected balance per day
- 2.5.4 Warning indicators when balance projected to go below threshold
- 2.5.5 "Safe days" vs "Risk days" color coding
- 2.5.6 Ability to see forecast for different months
- 2.5.7 Forecast updates in real-time as transactions added/modified
- 2.5.8 Forecast requires minimum 14 days of historical transaction data
- 2.5.9 Show "Add more transactions" message when insufficient data
- 2.5.10 Low-confidence forecasts are hidden from users (not displayed)
- 2.5.11 Show message encouraging more transaction history instead

**Forecast Formula:**
```
For each day D in selected month:
  Projected Balance(D) = 
    Current Balance +
    Sum(Completed Transactions until D) +
    Sum(Planned Transactions until D) -
    (Days Until D × Average Daily Spending)

Where:
  Average Daily Spending = 
    Total Expenses Last 30 Days / 30
    (excluding one-time large purchases > 2x median)
    
Note: Apply 10% conservative multiplier to estimated daily spending
for safety margin (estimatedSpending × 1.1)
```

### 2.6 Upcoming Payments & Risks Widget (CRITICAL - P0)

**As a user with upcoming expenses**
- I want to see what payments are coming and if I'm at risk
- So that I can prepare and avoid payment failures

**Acceptance Criteria:**
- 2.6.1 Widget shows upcoming planned transactions (next 30 days)
- 2.6.2 Sorted by date (soonest first)
- 2.6.3 Risk indicators:
  - 🟢 Green: Safe - sufficient balance projected
  - 🟡 Yellow: Warning - balance will be tight
  - 🔴 Red: Risk - insufficient balance projected
- 2.6.4 Shows amount and days until payment
- 2.6.5 Quick action to mark as paid (convert to completed)
- 2.6.6 Shows total upcoming expenses for next 7/14/30 days
- 2.6.7 Alert when high-risk payment detected

### 2.7 Balance Overview Widget (P0)

**As a user managing multiple accounts**
- I want to see my total available balance
- So that I know my current financial position

**Acceptance Criteria:**
- 2.7.1 Shows total balance across all accounts
- 2.7.2 Account-level breakdown with reconciliation status
- 2.7.3 Visual indicators for accounts needing reconciliation
- 2.7.4 Quick link to reconcile accounts
- 2.7.5 Debt vs. Asset separation

### 2.8 Spending Trends Analysis (P1)

**As a user tracking expenses**
- I want to understand my spending patterns
- So that I can make informed decisions

**Acceptance Criteria:**
- 2.8.1 Shows spending by category for selected month
- 2.8.2 Comparison to previous month (% change)
- 2.8.3 Comparison to 3-month average
- 2.8.4 Identifies unusual spending patterns
- 2.8.5 Top 3 spending categories highlighted
- 2.8.6 Average daily spending calculation
- 2.8.7 Trend direction indicators (increasing/decreasing/stable)

## 3. Technical Requirements

### 3.1 Database Schema Changes

**New Fields:**
- `transactions.status`: ENUM('completed', 'planned') - default 'completed'
- `transactions.planned_date`: DATE - for future transactions
- `transactions.completed_at`: TIMESTAMP - when planned transaction completed

**New Tables:**
- `user_milestones`: Track achievement moments
  - id, user_id, workspace_id, milestone_type, achieved_at, metadata

### 3.2 Performance Requirements
- Month filtering must be instant (<100ms)
- Dashboard analytics calculations cached (5-minute TTL)
- Future transaction queries optimized with indexes

### 3.3 Data Integrity
- Future transactions cannot affect current balances
- Reconciliation calculations exclude planned transactions
- Converting planned → completed updates balances atomically

## 4. UX Requirements

### 4.1 Onboarding Flow States

**State 1: No Workspace**
- Show: Workspace creation card with benefits
- Block: All features except settings
- Action: Single "Create Workspace" button

**State 2: Workspace, No Accounts**
- Show: Account creation card with explanation
- Block: Transactions, Reports
- Allow: Accounts page, Categories, Settings
- Action: Single "Create First Account" button

**State 3: Workspace + Accounts**
- Show: Full application
- Allow: All features
- Guide: Subtle hints for first transaction

### 4.2 Month Navigation UX

**Design:**
- Dropdown showing: "February 2026" with transaction count
- Previous/Next arrow buttons on sides
- Quick jump to "Current Month" button
- Visual indicator when viewing past/future months

### 4.3 Emotional Feedback UX

**Celebration Moments:**
- First transaction: Confetti animation + "Great start!"
- First week complete: Badge + "You're building a habit!"
- First month complete: Achievement card + "You've got this!"
- Spending reduction: Green trend arrow + "You saved X% this month!"

**Visual Language:**
- Order: Clean, organized, green indicators
- Chaos: Scattered, red/amber indicators
- Progress: Upward trends, growth emerald color
- Achievement: Gold accents, celebration animations

## 5. Analytics Requirements

### 5.1 Daily Cash Flow Forecast Calculation

**Input Data:**
- Current account balances (as of today)
- Historical completed transactions (last 30-90 days)
- Planned/future transactions (with dates)
- Recurring transaction patterns (if any)

**Calculation Logic:**
```typescript
interface DailyForecast {
  date: Date
  projectedBalance: number
  confidence: 'high' | 'medium' | 'low'
  riskLevel: 'safe' | 'warning' | 'danger'
  breakdown: {
    startingBalance: number
    plannedIncome: number
    plannedExpenses: number
    estimatedDailySpending: number
    endingBalance: number
  }
}

function calculateDailyForecast(
  startDate: Date,
  endDate: Date,
  currentBalance: number,
  completedTransactions: Transaction[],
  plannedTransactions: Transaction[]
): DailyForecast[] {
  // 1. Calculate average daily spending from history
  const avgDailySpending = calculateAverageDailySpending(
    completedTransactions,
    { excludeOneTimeLarge: true, lookbackDays: 30 }
  )
  
  // 2. For each day in range
  const forecasts: DailyForecast[] = []
  let runningBalance = currentBalance
  
  for (let date = startDate; date <= endDate; date++) {
    // 3. Add planned income for this day
    const plannedIncome = sumPlannedTransactions(
      plannedTransactions,
      date,
      'income'
    )
    
    // 4. Subtract planned expenses for this day
    const plannedExpenses = sumPlannedTransactions(
      plannedTransactions,
      date,
      'expense'
    )
    
    // 5. Subtract estimated daily spending
    const estimatedSpending = avgDailySpending
    
    // 6. Calculate projected balance
    const projectedBalance = 
      runningBalance + 
      plannedIncome - 
      plannedExpenses - 
      estimatedSpending
    
    // 7. Determine risk level
    const riskLevel = determineRiskLevel(projectedBalance, {
      dangerThreshold: 0,
      warningThreshold: avgDailySpending * 7 // 7 days buffer
    })
    
    // 8. Determine confidence based on data quality
    const confidence = determineConfidence(date, {
      hasHistoricalData: completedTransactions.length > 30,
      daysInFuture: differenceInDays(date, new Date())
    })
    
    forecasts.push({
      date,
      projectedBalance,
      confidence,
      riskLevel,
      breakdown: {
        startingBalance: runningBalance,
        plannedIncome,
        plannedExpenses,
        estimatedDailySpending: estimatedSpending,
        endingBalance: projectedBalance
      }
    })
    
    runningBalance = projectedBalance
  }
  
  return forecasts
}

function calculateAverageDailySpending(
  transactions: Transaction[],
  options: { excludeOneTimeLarge: boolean; lookbackDays: number }
): number {
  // Filter to expenses only
  const expenses = transactions.filter(t => t.type === 'expense')
  
  // Exclude one-time large purchases (> 2x median)
  if (options.excludeOneTimeLarge) {
    const median = calculateMedian(expenses.map(t => t.amount))
    expenses = expenses.filter(t => t.amount <= median * 2)
  }
  
  // Calculate average
  const totalExpenses = sum(expenses.map(t => t.amount))
  const avgDaily = totalExpenses / options.lookbackDays
  
  return avgDaily
}

function determineRiskLevel(
  balance: number,
  thresholds: { dangerThreshold: number; warningThreshold: number }
): 'safe' | 'warning' | 'danger' {
  if (balance < thresholds.dangerThreshold) return 'danger'
  if (balance < thresholds.warningThreshold) return 'warning'
  return 'safe'
}

function determineConfidence(
  forecastDate: Date,
  factors: { hasHistoricalData: boolean; daysInFuture: number }
): 'high' | 'medium' | 'low' {
  if (!factors.hasHistoricalData) return 'low'
  if (factors.daysInFuture > 30) return 'low'
  if (factors.daysInFuture > 14) return 'medium'
  return 'high'
}
```

### 5.2 Upcoming Payments Risk Assessment

**Risk Calculation:**
```typescript
interface PaymentRisk {
  transaction: PlannedTransaction
  daysUntil: number
  projectedBalanceAtDate: number
  riskLevel: 'safe' | 'warning' | 'danger'
  recommendation: string
}

function assessPaymentRisks(
  plannedTransactions: PlannedTransaction[],
  dailyForecasts: DailyForecast[]
): PaymentRisk[] {
  return plannedTransactions.map(transaction => {
    const forecast = dailyForecasts.find(
      f => isSameDay(f.date, transaction.date)
    )
    
    const projectedBalance = forecast?.projectedBalance ?? 0
    const balanceAfterPayment = projectedBalance - transaction.amount
    
    let riskLevel: 'safe' | 'warning' | 'danger'
    let recommendation: string
    
    if (balanceAfterPayment < 0) {
      riskLevel = 'danger'
      recommendation = `Insufficient funds. Need ${formatCurrency(
        Math.abs(balanceAfterPayment)
      )} more.`
    } else if (balanceAfterPayment < forecast.breakdown.estimatedDailySpending * 3) {
      riskLevel = 'warning'
      recommendation = 'Balance will be tight. Consider postponing non-essential expenses.'
    } else {
      riskLevel = 'safe'
      recommendation = 'Sufficient funds available.'
    }
    
    return {
      transaction,
      daysUntil: differenceInDays(transaction.date, new Date()),
      projectedBalanceAtDate: projectedBalance,
      riskLevel,
      recommendation
    }
  })
}
```

### 5.3 Spending Trend Calculation

```typescript
interface SpendingTrend {
  category: Category
  currentMonth: number
  previousMonth: number
  threeMonthAverage: number
  percentChange: number
  trend: 'increasing' | 'decreasing' | 'stable'
  isUnusual: boolean
}

function calculateSpendingTrends(
  transactions: Transaction[],
  selectedMonth: Date
): SpendingTrend[] {
  const categories = getUniqueCategories(transactions)
  
  return categories.map(category => {
    const currentMonth = sumTransactionsByCategory(
      transactions,
      category,
      selectedMonth
    )
    
    const previousMonth = sumTransactionsByCategory(
      transactions,
      category,
      subMonths(selectedMonth, 1)
    )
    
    const threeMonthAverage = calculateAverageSpending(
      transactions,
      category,
      selectedMonth,
      3
    )
    
    const percentChange = 
      ((currentMonth - previousMonth) / previousMonth) * 100
    
    const trend = 
      percentChange > 5 ? 'increasing' :
      percentChange < -5 ? 'decreasing' :
      'stable'
    
    const isUnusual = Math.abs(currentMonth - threeMonthAverage) > 
      (threeMonthAverage * 0.5) // 50% deviation
    
    return {
      category,
      currentMonth,
      previousMonth,
      threeMonthAverage,
      percentChange,
      trend,
      isUnusual
    }
  })
}
```

## 6. Migration & Rollout

### 6.1 Existing Users
- All existing transactions default to 'completed' status
- No data migration needed for new fields (nullable)
- Gradual rollout of analytics (show when enough data)

### 6.2 Feature Flags
- `FEATURE_FUTURE_TRANSACTIONS`: Enable planned transactions
- `FEATURE_MONTH_NAVIGATION`: Enable month-based filtering
- `FEATURE_ANALYTICS_DASHBOARD`: Enable emotional value widgets

## 7. Success Metrics

### 7.1 Safety & Control Metrics
- Users check forecast before making purchases: 60%+
- Users avoid payment failures: 95%+
- Users feel "safe and in control": 80%+

### 7.2 Engagement Metrics
- Daily active users increase by 40%
- Users check upcoming payments daily: 50%+
- Future transaction planning adoption: 70%+

### 7.3 Feature Adoption
- 90% of users create accounts within first session
- 70% of users enter first transaction within first day
- 80% of users add at least one planned transaction within first week
- 60% of users check daily forecast at least 3x per week

## 8. Out of Scope (Future Versions)

- AI-powered spending predictions
- Automatic bill detection and reminders
- Budget vs. actual comparisons with alerts
- Goal setting with progress tracking
- Debt payoff strategies and calculators
- Investment tracking and portfolio management
- Bank statement import and parsing
- Receipt scanning and OCR
- Multi-currency advanced forecasting
- Collaborative family budgeting workflows
- Credit score tracking
- Savings recommendations based on patterns

## 9. Dependencies

### 9.1 Existing Features Required
- ✅ Workspace management
- ✅ Account management
- ✅ Transaction CRUD
- ✅ Category system
- ✅ Reconciliation system

### 9.2 New Components Needed
- Month selector component
- Analytics dashboard widgets
- Celebration animation system
- Order score calculator
- Trend visualization charts
- Milestone tracking system

## 10. Acceptance Criteria Summary

**Must Have (P0) - Core Safety Features:**
- ✅ Consistent access control across all pages
- ✅ Settings always accessible
- ✅ Account requirement before transactions
- ✅ Future transaction capability (planned status)
- ✅ Month-based navigation
- ✅ Daily cash flow forecast for selected month
- ✅ Upcoming payments & risks widget
- ✅ Balance overview widget
- ✅ Risk indicators and warnings

**Should Have (P1) - Enhanced Insights:**
- ✅ Spending trends by category
- ✅ Month-over-month comparisons
- ✅ Average daily spending calculation
- ✅ Unusual spending pattern detection

**Nice to Have (P2) - Polish:**
- Calendar view for planned transactions
- Advanced forecast scenarios (what-if analysis)
- Export capabilities
- Customizable risk thresholds
- Notification system for high-risk payments
