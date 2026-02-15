# Forecast Calculation Logic - Developer Guide

## Overview

This document explains the mathematical and algorithmic logic behind Forma's financial forecasting system. Understanding these calculations is essential for maintaining and extending the forecast features.

---

## 1. Average Daily Spending Calculation

### Purpose

Calculate a realistic estimate of daily spending by analyzing historical expense transactions while excluding one-time large purchases.

### Algorithm

```
Input: Array of transactions with {amount, date, type}
Output: {averageDailySpending, confidence, metadata}

Step 1: Filter for expense transactions only
  expenses = transactions.filter(t => t.type === 'expense')

Step 2: Calculate date range
  minDate = min(expenses.map(t => t.date))
  maxDate = max(expenses.map(t => t.date))
  daysAnalyzed = daysBetween(minDate, maxDate) + 1

Step 3: Check minimum data requirement
  if daysAnalyzed < 14:
    return {confidence: 'none', ...}

Step 4: Calculate median for outlier detection
  amounts = expenses.map(t => t.amount).sort()
  median = amounts[floor(length / 2)]

Step 5: Exclude outliers (one-time large purchases)
  threshold = median × outlierMultiplier  // default: 3
  includedExpenses = expenses.filter(t => t.amount <= threshold)
  excludedCount = expenses.length - includedExpenses.length

Step 6: Calculate average
  totalSpending = sum(includedExpenses.map(t => t.amount))
  averageDailySpending = totalSpending / daysAnalyzed

Step 7: Determine confidence
  if daysAnalyzed >= 30:
    confidence = 'high'
  else if daysAnalyzed >= 14:
    confidence = 'medium'
  else:
    confidence = 'low'

Return {averageDailySpending, confidence, metadata}
```

### Mathematical Formula

```
Average Daily Spending = Σ(included expenses) / days analyzed

Where:
  included expenses = expenses where amount ≤ (median × 3)
  days analyzed = (max date - min date) + 1
```

### Example Calculation

**Input Data**:
```
Transactions (30 days):
- Day 1: ₴100 (grocery)
- Day 3: ₴50 (coffee)
- Day 5: ₴150 (grocery)
- Day 7: ₴2000 (laptop - outlier)
- Day 10: ₴80 (restaurant)
- Day 15: ₴120 (grocery)
- Day 20: ₴90 (gas)
- Day 25: ₴110 (grocery)
```

**Calculation**:
```
1. Filter expenses: 8 transactions
2. Date range: 30 days
3. Amounts sorted: [50, 80, 90, 100, 110, 120, 150, 2000]
4. Median: (100 + 110) / 2 = 105
5. Threshold: 105 × 3 = 315
6. Included: [50, 80, 90, 100, 110, 120, 150] (7 transactions)
7. Excluded: [2000] (1 transaction - laptop)
8. Total spending: 700
9. Average: 700 / 30 = ₴23.33 per day
10. Confidence: 'high' (30 days)
```

### Edge Cases

**Case 1: All transactions are outliers**
```
If all transactions > threshold:
  Use all transactions (don't exclude any)
  Set confidence = 'low'
```

**Case 2: Insufficient data (< 14 days)**
```
If daysAnalyzed < 14:
  Calculate average anyway (for internal use)
  Set confidence = 'none'
  Set shouldDisplay = false
```

**Case 3: No transactions**
```
If expenses.length === 0:
  Return {averageDailySpending: 0, confidence: 'none'}
```

---

## 2. Daily Forecast Calculation

### Purpose

Project future account balances day-by-day, accounting for planned transactions and estimated daily spending.

### Algorithm

```
Input:
  - currentBalance: Starting balance
  - historicalTransactions: For spending calculation
  - plannedTransactions: Future income/expenses
  - startDate, endDate: Forecast period
  - userSettings: {minimumSafeBalance, safetyBufferDays}

Output: {forecasts[], averageDailySpending, confidence, shouldDisplay}

Step 1: Calculate average daily spending
  spendingResult = calculateAverageDailySpending(historicalTransactions)
  
  if spendingResult.confidence === 'none':
    return {forecasts: [], shouldDisplay: false}

Step 2: Apply conservative multiplier
  conservativeDaily = spendingResult.averageDailySpending × 1.1
  // 10% safety margin

Step 3: Initialize running balance
  runningBalance = currentBalance

Step 4: For each day in [startDate, endDate]:
  
  4a. Find planned transactions for this day
    dayPlanned = plannedTransactions.filter(t => t.date === currentDay)
  
  4b. Calculate planned income and expenses
    plannedIncome = sum(dayPlanned.filter(t => t.type === 'income'))
    plannedExpenses = sum(dayPlanned.filter(t => t.type === 'expense'))
  
  4c. Calculate projected balance
    startingBalance = runningBalance
    endingBalance = startingBalance 
                  + plannedIncome 
                  - plannedExpenses 
                  - conservativeDaily
  
  4d. Determine risk level
    if endingBalance < minimumSafeBalance:
      riskLevel = 'danger'
    else if endingBalance < minimumSafeBalance + (conservativeDaily × safetyBufferDays):
      riskLevel = 'warning'
    else:
      riskLevel = 'safe'
  
  4e. Determine confidence for this day
    daysInFuture = daysBetween(today, currentDay)
    if spendingConfidence === 'low' OR daysInFuture > 30:
      confidence = 'low'
    else if daysInFuture > 14:
      confidence = 'medium'
    else:
      confidence = spendingConfidence
  
  4f. Store forecast
    forecasts.push({
      date: currentDay,
      projectedBalance: endingBalance,
      confidence,
      riskLevel,
      breakdown: {startingBalance, plannedIncome, plannedExpenses, 
                  estimatedDailySpending: conservativeDaily, endingBalance}
    })
  
  4g. Update running balance for next day
    runningBalance = endingBalance

Step 5: Determine if forecast should be displayed
  shouldDisplay = (spendingConfidence === 'high' OR spendingConfidence === 'medium')

Return {forecasts, averageDailySpending: conservativeDaily, 
        spendingConfidence, shouldDisplay}
```

### Mathematical Formula

```
For each day d:

Projected Balance(d) = Balance(d-1) 
                     + Planned Income(d) 
                     - Planned Expenses(d) 
                     - (Average Daily Spending × 1.1)

Where:
  Balance(d-1) = Previous day's ending balance (or current balance for first day)
  Planned Income(d) = Sum of planned income transactions on day d
  Planned Expenses(d) = Sum of planned expense transactions on day d
  Average Daily Spending = From historical calculation
  1.1 = Conservative multiplier (10% safety margin)
```

### Risk Level Determination

```
Risk Level Formula:

warningThreshold = minimumSafeBalance + (conservativeDailySpending × safetyBufferDays)

if projectedBalance < minimumSafeBalance:
  riskLevel = 'danger'
else if projectedBalance < warningThreshold:
  riskLevel = 'warning'
else:
  riskLevel = 'safe'
```

**Example with default settings**:
```
minimumSafeBalance = ₴1000
safetyBufferDays = 7
conservativeDailySpending = ₴150

warningThreshold = 1000 + (150 × 7) = ₴2050

Balance ₴500:  danger  (< ₴1000)
Balance ₴1500: warning (< ₴2050)
Balance ₴3000: safe    (>= ₴2050)
```

### Example Calculation

**Input**:
```
Current Balance: ₴5000
Average Daily Spending: ₴150 (from historical data)
Conservative Daily: ₴150 × 1.1 = ₴165
Minimum Safe Balance: ₴1000
Safety Buffer: 7 days

Planned Transactions:
- Feb 5: +₴3000 (salary)
- Feb 10: -₴800 (rent)
- Feb 15: -₴500 (utilities)
```

**Calculation for Feb 1-5**:
```
Feb 1:
  Starting: ₴5000
  Planned Income: ₴0
  Planned Expenses: ₴0
  Daily Spending: -₴165
  Ending: ₴4835
  Risk: safe (₴4835 > ₴2050)

Feb 2:
  Starting: ₴4835
  Planned Income: ₴0
  Planned Expenses: ₴0
  Daily Spending: -₴165
  Ending: ₴4670
  Risk: safe

Feb 3:
  Starting: ₴4670
  Ending: ₴4505
  Risk: safe

Feb 4:
  Starting: ₴4505
  Ending: ₴4340
  Risk: safe

Feb 5:
  Starting: ₴4340
  Planned Income: +₴3000 (salary)
  Planned Expenses: ₴0
  Daily Spending: -₴165
  Ending: ₴7175
  Risk: safe
```

### Confidence Degradation

Confidence decreases with distance into the future:

```
Days Ahead | Spending Confidence | Forecast Confidence
-----------|--------------------|-----------------
0-14       | high               | high
0-14       | medium             | medium
15-30      | high               | medium
15-30      | medium             | medium
31+        | any                | low
any        | low/none           | low
```

---

## 3. Payment Risk Assessment

### Purpose

Identify upcoming planned expenses that may cause insufficient funds and provide actionable recommendations.

### Algorithm

```
Input:
  - plannedTransactions: Future transactions
  - dailyForecasts: From daily forecast calculation
  - averageDailySpending: Conservative daily spending
  - safetyBufferDays: Number of days of buffer (default: 7)

Output: Array of PaymentRisk objects

Step 1: Filter to expense transactions only
  expenses = plannedTransactions.filter(t => t.type === 'expense')

Step 2: For each planned expense:
  
  2a. Calculate days until payment
    daysUntil = daysBetween(today, transaction.date)
  
  2b. Find forecast for payment date
    forecast = dailyForecasts.find(f => f.date === transaction.date)
    
    if !forecast:
      return {riskLevel: 'danger', 
              recommendation: 'Unable to calculate - insufficient forecast data',
              canAfford: false}
  
  2c. Calculate balance after payment
    projectedBalance = forecast.breakdown.startingBalance
    balanceAfterPayment = projectedBalance - transaction.amount
    safetyBuffer = averageDailySpending × safetyBufferDays
  
  2d. Determine risk level and recommendation
    if balanceAfterPayment < 0:
      riskLevel = 'danger'
      shortfall = abs(balanceAfterPayment)
      recommendation = "Insufficient funds. Need ₴{shortfall} more by {date}."
      canAfford = false
    
    else if balanceAfterPayment < safetyBuffer:
      riskLevel = 'warning'
      recommendation = "Balance will be tight. Only ₴{balanceAfterPayment} remaining 
                       after payment (less than {safetyBufferDays}-day buffer)."
      canAfford = true
    
    else:
      riskLevel = 'safe'
      recommendation = "Sufficient funds available. ₴{balanceAfterPayment} 
                       remaining after payment."
      canAfford = true
  
  2e. Store risk assessment
    risks.push({
      transaction,
      daysUntil,
      projectedBalanceAtDate: projectedBalance,
      balanceAfterPayment,
      riskLevel,
      recommendation,
      canAfford
    })

Step 3: Sort by urgency (soonest first)
  risks.sort((a, b) => a.daysUntil - b.daysUntil)

Return risks
```

### Mathematical Formula

```
For each planned expense:

Balance After Payment = Projected Balance - Payment Amount

Safety Buffer = Average Daily Spending × Safety Buffer Days

Risk Level:
  if Balance After Payment < 0:
    'danger'
  else if Balance After Payment < Safety Buffer:
    'warning'
  else:
    'safe'
```

### Example Calculation

**Input**:
```
Planned Expenses:
1. Feb 10: ₴800 (rent)
2. Feb 15: ₴500 (utilities)
3. Feb 20: ₴200 (insurance)

Daily Forecasts:
- Feb 10: Projected balance = ₴3500
- Feb 15: Projected balance = ₴2200
- Feb 20: Projected balance = ₴1500

Average Daily Spending: ₴165
Safety Buffer: ₴165 × 7 = ₴1155
```

**Calculation**:
```
Payment 1 (Feb 10 - Rent ₴800):
  Days until: 9
  Projected balance: ₴3500
  Balance after: ₴3500 - ₴800 = ₴2700
  Risk: safe (₴2700 > ₴1155)
  Recommendation: "Sufficient funds available. ₴2700 remaining after payment."
  Can afford: true

Payment 2 (Feb 15 - Utilities ₴500):
  Days until: 14
  Projected balance: ₴2200
  Balance after: ₴2200 - ₴500 = ₴1700
  Risk: safe (₴1700 > ₴1155)
  Recommendation: "Sufficient funds available. ₴1700 remaining after payment."
  Can afford: true

Payment 3 (Feb 20 - Insurance ₴200):
  Days until: 19
  Projected balance: ₴1500
  Balance after: ₴1500 - ₴200 = ₴1300
  Risk: warning (₴1300 > ₴1155 but close)
  Recommendation: "Balance will be tight. Only ₴1300 remaining after payment 
                  (less than 7-day buffer)."
  Can afford: true
```

---

## 4. Conservative Estimates

### Why Conservative?

The forecast system uses conservative estimates to avoid false confidence. It's better to:
- **Overestimate expenses** → User has more money than expected (pleasant surprise)
- **Underestimate income** → Not implemented (income is exact from planned transactions)

### Conservative Multiplier

```
Conservative Daily Spending = Average Daily Spending × 1.1

This adds a 10% safety margin to account for:
- Unexpected expenses
- Calculation uncertainty
- Spending variations
```

**Example**:
```
Average Daily Spending: ₴150
Conservative Estimate: ₴150 × 1.1 = ₴165

Over 30 days:
  Average projection: ₴150 × 30 = ₴4500
  Conservative projection: ₴165 × 30 = ₴4950
  Safety margin: ₴450 (10%)
```

### Outlier Exclusion

Large one-time purchases are excluded to avoid inflating daily spending:

```
Threshold = Median × 3

Example:
  Transactions: [₴50, ₴80, ₴100, ₴120, ₴2000]
  Median: ₴100
  Threshold: ₴300
  Excluded: ₴2000 (laptop purchase)
  
Without exclusion: Average = ₴470/day
With exclusion: Average = ₴87.50/day
```

---

## 5. Confidence Levels

### Spending Confidence

Based on amount of historical data:

```
Confidence Level | Days of Data | Reliability
-----------------|--------------|-------------
high             | 30+          | Very reliable
medium           | 14-29        | Moderately reliable
low              | 1-13         | Unreliable (all outliers)
none             | < 14         | Insufficient data
```

### Forecast Confidence

Based on spending confidence and distance into future:

```
Forecast Confidence = min(Spending Confidence, Distance Confidence)

Distance Confidence:
  0-14 days ahead:  high
  15-30 days ahead: medium
  31+ days ahead:   low
```

**Example**:
```
Spending Confidence: high (30 days of data)

Day 5 forecast:  high (5 days ahead)
Day 20 forecast: medium (20 days ahead)
Day 40 forecast: low (40 days ahead)
```

---

## 6. User Settings

### Minimum Safe Balance

User-defined threshold for "danger" risk level:

```
Default: ₴1000

User can set based on:
- Monthly expenses
- Emergency fund preference
- Risk tolerance
```

### Safety Buffer Days

Number of days of spending to keep as buffer:

```
Default: 7 days

Warning Threshold = Minimum Safe Balance + (Daily Spending × Buffer Days)

Example with ₴150/day spending:
  3 days:  ₴1000 + ₴450 = ₴1450
  7 days:  ₴1000 + ₴1050 = ₴2050
  14 days: ₴1000 + ₴2100 = ₴3100
```

---

## 7. Caching Strategy

### Cache Key

```
cacheKey = `${workspaceId}:${accountId}`
```

### Cache TTL

```
TTL = 5 minutes (300,000 milliseconds)
```

### Cache Invalidation

Invalidate cache when:
1. Transaction created
2. Transaction updated
3. Transaction deleted
4. User settings changed

```typescript
// After transaction change
forecastService.invalidateCache(workspaceId, accountId)

// After user settings change
forecastService.invalidateWorkspaceCache(workspaceId)
```

---

## 8. Performance Optimization

### Query Optimization

```
Historical Transactions:
  - Limit to last 90 days
  - Filter: is_expected = false (completed only)
  - Index on: (workspace_id, account_id, is_expected, transaction_date)

Planned Transactions:
  - Limit to forecast period
  - Filter: is_expected = true (planned only)
  - Index on: (workspace_id, account_id, is_expected, transaction_date)
```

### Calculation Complexity

```
Time Complexity:
  Average Daily Spending: O(n log n) - sorting for median
  Daily Forecast: O(d × p) - d days × p planned transactions per day
  Payment Risk: O(p × d) - p payments × d forecasts

Space Complexity:
  O(n + d + p) - store transactions, forecasts, and risks

Typical Performance:
  100 historical transactions: ~10ms
  30-day forecast: ~5ms
  10 planned payments: ~2ms
  Total: ~20ms (excluding database queries)
```

---

## 9. Testing Strategies

### Unit Test Cases

**Average Daily Spending**:
1. Normal case with sufficient data
2. Insufficient data (< 14 days)
3. All transactions are outliers
4. No transactions
5. Single transaction
6. Transactions on same day

**Daily Forecast**:
1. Normal case with planned transactions
2. No planned transactions
3. Insufficient historical data
4. Balance goes negative
5. Multiple risk levels in period
6. Far future dates (low confidence)

**Payment Risk**:
1. Safe payment (sufficient funds)
2. Warning payment (tight balance)
3. Danger payment (insufficient funds)
4. Missing forecast data
5. Multiple payments same day

### Integration Test Cases

1. Complete forecast flow (service → calculations)
2. Cache hit and miss scenarios
3. Cache invalidation
4. User settings integration
5. Database query performance

### Property-Based Test Cases

1. Balance never increases without income
2. Risk level consistent with balance
3. Confidence decreases with distance
4. Conservative estimate always >= average
5. Payment risk sorted by urgency

---

## 10. Common Pitfalls

### Pitfall 1: Not Excluding Outliers

```
❌ Problem:
  One-time laptop purchase (₴2000) inflates daily spending to ₴200/day

✅ Solution:
  Exclude transactions > 3× median
  Daily spending: ₴50/day (realistic)
```

### Pitfall 2: Not Applying Conservative Multiplier

```
❌ Problem:
  Exact average used, user runs out of money due to unexpected expenses

✅ Solution:
  Apply 1.1× multiplier for 10% safety margin
```

### Pitfall 3: Showing Low-Confidence Forecasts

```
❌ Problem:
  Showing forecast with only 5 days of data misleads user

✅ Solution:
  Set shouldDisplay = false when confidence is 'none'
  Show message encouraging more transaction history
```

### Pitfall 4: Not Invalidating Cache

```
❌ Problem:
  User adds transaction, forecast doesn't update

✅ Solution:
  Call invalidateCache() after every transaction change
```

### Pitfall 5: Incorrect Risk Thresholds

```
❌ Problem:
  Using fixed threshold (₴1000) for all users

✅ Solution:
  Use user-defined minimumSafeBalance from settings
  Allow customization of safety buffer days
```

---

## Summary

The forecast system uses three core calculations:

1. **Average Daily Spending**: Historical analysis with outlier exclusion
2. **Daily Forecast**: Day-by-day balance projection with conservative estimates
3. **Payment Risk**: Assessment of upcoming payments with actionable recommendations

Key principles:
- **Conservative estimates** (10% safety margin)
- **Outlier exclusion** (3× median threshold)
- **Confidence levels** (based on data quality and distance)
- **User-defined thresholds** (minimum safe balance, safety buffer)
- **Caching** (5-minute TTL with invalidation)

For implementation details, see:
- [Forecast API Documentation](FORECAST_API.md)
- Source code in `src/lib/calculations/`
- Tests in `tests/unit/calculations/` and `tests/integration/calculations/`
