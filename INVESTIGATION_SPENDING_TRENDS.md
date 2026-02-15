# Spending Trends Widget - Deep Investigation Report

## User Information
- **User ID**: `fa38643f-ca4d-4c13-8783-f6fd6bc22463`
- **Workspace**: `5c94dc82-4a7e-4847-8a3b-b2b18dc4216b` (1.2.0 Workspace Testing)
- **Current Month**: February 2026
- **Issue**: "Unusual Spending Detected" showing +100% for all categories

---

## INVESTIGATION FLOW (Database → UI)

### 1. DATABASE LAYER ✅

**Query Location**: `src/hooks/use-spending-trends.ts` (Lines 35-50)

```typescript
// Fetches transactions for last 4 months (current + 3 previous)
const startDate = new Date(year, month - 4, 1) // 4 months back
const endDate = new Date(year, month, 0) // Last day of current month

const { data, error } = await supabase
  .from('transactions')
  .select(`amount, transaction_date, type, category_id, category:categories(name)`)
  .eq('workspace_id', currentWorkspace.id)
  .eq('status', 'completed') // ⚠️ ONLY completed transactions
  .gte('transaction_date', startDate.toISOString().split('T')[0])
  .lte('transaction_date', endDate.toISOString().split('T')[0])
```

**Date Range for February 2026**:
- Start: October 1, 2025 (4 months back)
- End: February 29, 2026 (last day of current month)

**CRITICAL FINDING #1**: Only fetches `status = 'completed'` transactions
- Planned transactions are EXCLUDED
- This is correct behavior for spending analysis

---

### 2. CALCULATION LAYER

**Location**: `src/lib/calculations/spending-trends.ts`

#### A. Monthly Spending Calculation (Lines 50-80)
```typescript
function calculateMonthlySpendingByCategory(transactions, year, month) {
  // Filter for specific month
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date)
    return (
      t.type === 'expense' &&
      date.getFullYear() === year &&
      date.getMonth() + 1 === month
    )
  })
  
  // Group by category and sum amounts
}
```

**POTENTIAL BUG #1**: Date parsing with `new Date(t.transaction_date)`
- Database returns: `'2026-02-14'` (string)
- JavaScript Date constructor: May have timezone issues
- Could cause off-by-one day errors

#### B. 3-Month Average Calculation (Lines 88-125)
```typescript
function calculateThreeMonthAverage(transactions, categoryId, endYear, endMonth) {
  const amounts: number[] = []
  
  // Calculate spending for each of the last 3 months
  for (let i = 0; i < 3; i++) {
    let year = endYear
    let month = endMonth - i
    
    // Handle year boundary
    if (month <= 0) {
      month += 12
      year -= 1
    }
    
    // Calculate spending for this month
    const monthSpending = transactions.filter(...).reduce(...)
    amounts.push(monthSpending)
  }
  
  // Return average
  return amounts.reduce((sum, amount) => sum + amount, 0) / 3
}
```

**CRITICAL FINDING #2**: 3-Month Average Includes Current Month!
- For February 2026, calculates average of:
  - February 2026 (i=0)
  - January 2026 (i=1)
  - December 2025 (i=2)

**THIS IS THE BUG!** 🐛

The 3-month average SHOULD NOT include the current month. It should be:
- January 2026
- December 2025
- November 2025

**Why This Causes "Unusual Spending"**:
1. User has NO historical data (November, December, January = 0)
2. User adds transactions in February 2026
3. 3-month average = (Feb + 0 + 0) / 3 = Feb / 3
4. Current month = Feb
5. Comparison: Feb vs (Feb/3) = 300% increase!
6. Threshold: 50% deviation = UNUSUAL ✅

**Example with Real Numbers**:
- February spending: 100,225 грн
- 3-month average: (100,225 + 0 + 0) / 3 = 33,408 грн
- Deviation: (100,225 - 33,408) / 33,408 = 200% 
- Result: UNUSUAL (>50% threshold) ✅

#### C. Unusual Spending Detection (Lines 145-157)
```typescript
function isUnusualSpending(currentAmount: number, threeMonthAverage: number): boolean {
  if (threeMonthAverage === 0) return false // ⚠️ Edge case
  
  const deviation = Math.abs(currentAmount - threeMonthAverage) / threeMonthAverage
  
  return deviation > 0.5 // 50% threshold
}
```

**CRITICAL FINDING #3**: When average is 0, returns FALSE
- This is correct: Can't detect unusual spending without history
- BUT: With the bug above, average is never 0 (it includes current month)

---

### 3. UI LAYER

**Location**: `src/components/forecast/spending-trends-widget.tsx`

**Display Logic** (Lines 280-295):
```typescript
{trendsData.unusualCategories.length > 0 && (
  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
    <AlertTriangle className="w-4 h-4 text-amber-500" />
    <p>Unusual Spending Detected</p>
    <p>{trendsData.unusualCategories.length} categories have spending 
       significantly different from your 3-month average</p>
  </div>
)}
```

**Category Display** (Lines 60-110):
```typescript
<div className="flex items-center gap-2">
  {trend.isUnusual && (
    <AlertTriangle className="w-4 h-4 text-amber-500" />
  )}
</div>

<div className="mt-2">
  <span>vs 3-month avg</span>
  <span>{formatCurrency(trend.threeMonthAverage, currency)}</span>
  <div className="h-1.5 bg-primary/10 rounded-full">
    <div className={trend.currentMonth > trend.threeMonthAverage ? "bg-red-500" : "bg-green"}
         style={{ width: `${percentage}%` }} />
  </div>
</div>
```

---

## ROOT CAUSE ANALYSIS

### PRIMARY BUG: 3-Month Average Includes Current Month

**File**: `src/lib/calculations/spending-trends.ts`
**Function**: `calculateThreeMonthAverage` (Line 88)
**Issue**: Loop starts at `i = 0`, which includes the current month

```typescript
// BUGGY CODE:
for (let i = 0; i < 3; i++) {
  let year = endYear
  let month = endMonth - i  // i=0 means current month!
  // ...
}
```

**Should Be**:
```typescript
// FIXED CODE:
for (let i = 1; i <= 3; i++) {  // Start at i=1 to skip current month
  let year = endYear
  let month = endMonth - i
  // ...
}
```

### SECONDARY ISSUE: No Historical Data

**Current State**:
- User has transactions ONLY in February 2026
- No data for November 2025, December 2025, January 2026
- This is expected for a new user

**With the bug**:
- 3-month avg = (Feb + 0 + 0) / 3 = Feb/3
- Shows as "unusual" because current month is 3x the average

**After fix**:
- 3-month avg = (Jan + Dec + Nov) / 3 = (0 + 0 + 0) / 3 = 0
- `isUnusualSpending` returns FALSE (correct behavior)
- No "unusual spending" warning ✅

---

## ADDITIONAL FINDINGS

### 1. Date Parsing Potential Issue
**Location**: `calculateMonthlySpendingByCategory` (Line 56)

```typescript
const date = new Date(t.transaction_date)
return (
  t.type === 'expense' &&
  date.getFullYear() === year &&
  date.getMonth() + 1 === month
)
```

**Potential Problem**:
- Database returns: `'2026-02-14'` (ISO date string)
- `new Date('2026-02-14')` parses as UTC midnight
- `getMonth()` and `getFullYear()` use LOCAL timezone
- Could cause off-by-one day errors near month boundaries

**Recommendation**: Use UTC methods or string comparison
```typescript
// Option 1: String comparison (safest)
const dateStr = t.transaction_date // '2026-02-14'
const [y, m] = dateStr.split('-').map(Number)
return t.type === 'expense' && y === year && m === month

// Option 2: UTC methods
const date = new Date(t.transaction_date + 'T00:00:00Z')
return (
  t.type === 'expense' &&
  date.getUTCFullYear() === year &&
  date.getUTCMonth() + 1 === month
)
```

### 2. Percentage Change Calculation
**Location**: `calculateSpendingTrends` (Lines 220-227)

```typescript
let percentChange = 0
if (previousAmount > 0) {
  percentChange = ((currentAmount - previousAmount) / previousAmount) * 100
} else if (currentAmount > 0) {
  percentChange = 100 // New spending category
}
```

**Finding**: Correct logic
- If previous month = 0 and current > 0: Shows +100%
- This is mathematically correct for new spending

### 3. Progress Bar Calculation
**Location**: `spending-trends-widget.tsx` (Lines 95-102)

```typescript
style={{ 
  width: `${Math.min(
    (trend.currentMonth / Math.max(trend.threeMonthAverage, trend.currentMonth)) * 100,
    100
  )}%` 
}}
```

**Finding**: Correct logic
- Prevents division by zero
- Caps at 100%
- Visual representation is accurate

---

## SCREENSHOT ANALYSIS

From the provided screenshot:

```
Total Spending This Month: 100 225,00 грн
vs Last Month: +100.0%
Avg Daily: 3 579,46 грн

Unusual Spending Detected
5 categories have spending significantly different from your 3-month average

Categories (5):
1. Transportation: 54 000,00 грн (+100.0%, was 0,00 грн, vs 3-month avg: 18 000,00 грн)
2. Bills & Utilities: 45 525,00 грн (+100.0%, was 0,00 грн, vs 3-month avg: 15 175,00 грн)
3. Food & Dining: 500,00 грн (+100.0%, was 0,00 грн, vs 3-month avg: 166,67 грн)
4. Entertainment: 120,00 грн (+100.0%, was 0,00 грн, vs 3-month avg: 40,00 грн)
5. Healthcare: 80,00 грн (+100.0%, was 0,00 грн, vs 3-month avg: 26,67 грн)
```

**Analysis**:
- All categories show "+100.0%" (previous month was 0)
- All show "was 0,00 грн" (no January data)
- 3-month averages are exactly 1/3 of current amounts:
  - Transportation: 54,000 / 3 = 18,000 ✅
  - Bills: 45,525 / 3 = 15,175 ✅
  - Food: 500 / 3 = 166.67 ✅
  - Entertainment: 120 / 3 = 40 ✅
  - Healthcare: 80 / 3 = 26.67 ✅

**This confirms the bug**: 3-month average = (Current + 0 + 0) / 3

---

## PROPOSED SOLUTION

### Fix #1: Correct 3-Month Average Calculation (CRITICAL)

**File**: `src/lib/calculations/spending-trends.ts`
**Line**: 95

```typescript
// BEFORE (BUGGY):
for (let i = 0; i < 3; i++) {
  let year = endYear
  let month = endMonth - i
  // ...
}

// AFTER (FIXED):
for (let i = 1; i <= 3; i++) {  // Start at 1 to exclude current month
  let year = endYear
  let month = endMonth - i
  // ...
}
```

### Fix #2: Improve Date Parsing (RECOMMENDED)

**File**: `src/lib/calculations/spending-trends.ts`
**Lines**: 56-62

```typescript
// BEFORE:
const date = new Date(t.transaction_date)
return (
  t.type === 'expense' &&
  date.getFullYear() === year &&
  date.getMonth() + 1 === month
)

// AFTER (Option 1 - String comparison):
const [y, m] = t.transaction_date.split('-').map(Number)
return (
  t.type === 'expense' &&
  y === year &&
  m === month
)

// AFTER (Option 2 - UTC methods):
const date = new Date(t.transaction_date + 'T00:00:00Z')
return (
  t.type === 'expense' &&
  date.getUTCFullYear() === year &&
  date.getUTCMonth() + 1 === month
)
```

---

## EXPECTED BEHAVIOR AFTER FIX

### Scenario 1: User with NO Historical Data (Current State)
- February 2026: 100,225 грн
- January 2026: 0 грн
- December 2025: 0 грн
- November 2025: 0 грн

**After Fix**:
- 3-month average: (0 + 0 + 0) / 3 = 0
- `isUnusualSpending(100225, 0)` returns FALSE
- No "Unusual Spending" warning ✅
- Categories show normal comparison to previous month

### Scenario 2: User with Historical Data
- February 2026: 100,000 грн
- January 2026: 80,000 грн
- December 2025: 85,000 грн
- November 2025: 90,000 грн

**After Fix**:
- 3-month average: (80,000 + 85,000 + 90,000) / 3 = 85,000 грн
- Deviation: |100,000 - 85,000| / 85,000 = 17.6%
- Below 50% threshold = NOT unusual ✅

### Scenario 3: Actual Unusual Spending
- February 2026: 200,000 грн (doubled spending!)
- January 2026: 80,000 грн
- December 2025: 85,000 грн
- November 2025: 90,000 грн

**After Fix**:
- 3-month average: 85,000 грн
- Deviation: |200,000 - 85,000| / 85,000 = 135%
- Above 50% threshold = UNUSUAL ✅ (correct!)

---

## MIGRATION STRATEGY

### Option 1: Backfill Historical Data (User Request)

**Goal**: Create 3 months of historical transactions (Nov, Dec, Jan)
**Target**: Average monthly expenses of ~265,000 грн

**Approach**:
1. Distribute 265,000 грн across categories proportionally
2. Create realistic transaction patterns
3. Spread transactions across the month
4. Use existing categories from February data

**Example Distribution** (based on February ratios):
- Transportation: 54,000 / 100,225 = 53.9% → 142,812 грн/month
- Bills & Utilities: 45,525 / 100,225 = 45.4% → 120,321 грн/month
- Food & Dining: 500 / 100,225 = 0.5% → 1,325 грн/month
- Entertainment: 120 / 100,225 = 0.1% → 318 грн/month
- Healthcare: 80 / 100,225 = 0.08% → 212 грн/month

**Months to Fill**:
- November 2025: 265,000 грн
- December 2025: 265,000 грн
- January 2026: 265,000 грн

### Option 2: Wait for Natural History

**Approach**: Fix the bug, let user accumulate real data over time
**Timeline**: 3 months for full historical context
**Pros**: Real data, accurate patterns
**Cons**: Takes time

---

## TESTING CHECKLIST

After implementing fixes:

### Unit Tests
- [ ] Test `calculateThreeMonthAverage` excludes current month
- [ ] Test with no historical data (all zeros)
- [ ] Test with partial historical data
- [ ] Test with full historical data
- [ ] Test year boundary (Dec → Jan)
- [ ] Test unusual spending detection threshold

### Integration Tests
- [ ] Test `useSpendingTrends` hook with real data
- [ ] Test widget rendering with no data
- [ ] Test widget rendering with unusual spending
- [ ] Test widget rendering with normal spending

### Manual Tests
- [ ] Load dashboard with current data
- [ ] Verify no "Unusual Spending" warning
- [ ] Check 3-month averages are correct
- [ ] Navigate to different months
- [ ] Add new transactions and verify recalculation

---

## FILES TO MODIFY

1. **CRITICAL**: `src/lib/calculations/spending-trends.ts` (Line 95)
   - Fix 3-month average calculation loop

2. **RECOMMENDED**: `src/lib/calculations/spending-trends.ts` (Lines 56-62, 108-116)
   - Improve date parsing to avoid timezone issues

3. **TESTS**: `src/lib/calculations/__tests__/spending-trends.test.ts`
   - Update tests to verify correct behavior

4. **MIGRATION** (if requested): Create script to backfill historical data
   - `scripts/backfill-spending-history.mjs`

---

## SUMMARY

### Bugs Found
1. ✅ **CRITICAL**: 3-month average includes current month (should exclude it)
2. ⚠️ **MINOR**: Date parsing may have timezone issues

### Root Cause
- Loop starts at `i = 0` instead of `i = 1`
- Causes current month to be included in its own average
- Results in false "unusual spending" warnings for new users

### Impact
- All new users see "Unusual Spending" warnings
- Misleading 3-month averages
- Incorrect trend analysis

### Fix Complexity
- **Simple**: One-line change in loop initialization
- **Testing**: Comprehensive test coverage needed
- **Migration**: Optional, depends on user preference

---

## NEXT STEPS

1. ⏳ **AWAITING DECISION**: Should we backfill historical data?
2. ⏳ **AWAITING APPROVAL**: Implement the bug fix
3. ⏳ **AWAITING APPROVAL**: Improve date parsing
4. ⏳ **READY**: Create migration script if requested

**Status**: Investigation Complete - Ready for Implementation
**Date**: February 15, 2026
**Investigator**: AI Assistant (Kiro)
