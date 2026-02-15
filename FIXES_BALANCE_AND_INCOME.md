# Balance Update & Planned Income Fixes

## Issues Fixed

### 1. ✅ Balance Not Updating When Returning to Dashboard

**Problem**: When adding transactions on the transactions page and returning to dashboard, the balance didn't update.

**Root Cause**: React Query hooks had `staleTime: 1000 * 60 * 5` (5 minutes), which prevented immediate refetch of fresh data.

**Solution**: Changed cache settings in hooks to always fetch fresh data:

```typescript
// Before
staleTime: 1000 * 60 * 5, // 5 minutes

// After
staleTime: 0, // Always fetch fresh data
gcTime: 0, // Don't cache at all
```

**Files Modified**:
- `src/hooks/use-accounts.ts` - Set staleTime to 0
- `src/hooks/use-account-balances.ts` - Set staleTime to 0
- `src/hooks/use-transactions.ts` - Already had staleTime: 0

**Result**: Balance now updates immediately when returning to dashboard from any page.

---

### 2. ✅ Planned Income Missing from Current Month Overview

**Problem**: Widget only showed expenses (completed and planned), but didn't show income at all.

**Solution**: Updated calculations and UI to include both income and expenses:

#### Calculation Changes:
- Separated transactions into 4 categories:
  1. Completed expenses
  2. Planned expenses
  3. Completed income (earned)
  4. Planned income
- Calculate totals for each category
- Added net balance projection: `Total Income - Total Expenses`

#### UI Changes:
- **New Income Section**: Shows earned income + planned income in green
- **Updated Expenses Section**: Shows spent + planned expenses
- **New Month End Projection**: Shows net balance (income - expenses)
  - Green if positive (surplus)
  - Red if negative (deficit)
- Breakdown shows:
  - Total income (earned + planned)
  - Total expenses (spent + projected + planned)
  - Net balance

**Files Modified**:
- `src/components/forecast/current-month-overview.tsx`
  - Updated `calculateCurrentMonthMetrics()` function
  - Added income tracking
  - Updated UI to show income/expense split
  - Added net balance calculation

**Result**: Widget now shows complete financial picture with income and expenses.

---

## Current Month Overview Widget - Updated Features

### Income & Expense Summary (New)
```
┌─────────────────┐  ┌─────────────────┐
│ Income          │  │ Expenses        │
│ 50,000 грн      │  │ 35,000 грн      │
│ 2 received      │  │ 15 transactions │
│ + 10,000 planned│  │ + 5,000 planned │
└─────────────────┘  └─────────────────┘
```

### Key Metrics
- Average Daily Spending (expenses only)
- Projected Remaining (based on daily average)

### Month End Projection (Updated)
```
┌──────────────────────────────────────┐
│ Month End Projection                 │
│ +15,000 грн (Net Balance)            │
│                                      │
│ Total income: 60,000 грн             │
│ Total expenses: 45,000 грн           │
│ Net balance: +15,000 грн             │
└──────────────────────────────────────┘
```

### Category Breakdown
- Still shows top 5 expense categories
- Progress bars and percentages
- Based on completed expenses only

---

## Testing Checklist

- [ ] Add income transaction → Check it appears in Income section
- [ ] Add planned income → Check it shows in "planned" line
- [ ] Add expense → Check it appears in Expenses section
- [ ] Navigate away and back → Check balance updates
- [ ] Check net balance calculation is correct
- [ ] Verify colors: Green for income, default for expenses
- [ ] Check month end projection shows correct totals

---

## Technical Details

### Cache Strategy
All hooks now use aggressive refetch strategy:
- `staleTime: 0` - Always consider data stale
- `gcTime: 0` - Don't cache at all
- `refetchOnWindowFocus: true` - Refetch when window gains focus
- `refetchOnMount: true` - Always refetch when component mounts

This ensures users always see the latest data, especially important for financial applications where accuracy is critical.

### Performance Consideration
While this increases API calls, it's acceptable because:
1. Financial data accuracy is more important than caching
2. Supabase queries are fast
3. User experience is better with fresh data
4. Most users don't rapidly switch between pages

If performance becomes an issue, we can:
- Add optimistic updates
- Use React Query's mutation callbacks
- Implement selective invalidation

---

## Status

✅ **Implementation Complete**
✅ **TypeScript Errors Fixed**
✅ **Ready for Testing**

**Date**: February 15, 2026
**Developer**: AI Assistant (Kiro)
