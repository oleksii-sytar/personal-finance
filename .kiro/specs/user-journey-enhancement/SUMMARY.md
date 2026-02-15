# User Journey & Financial Safety Enhancement - Summary

## What This Spec Addresses

You want to build an app that delivers **financial safety and control** through:
1. **Future Visibility** - See exactly how much money you'll have each day
2. **Risk Awareness** - Know about upcoming payments and potential issues
3. **Safety & Security** - Never be surprised by running out of money
4. **Ease & Planning** - Minimal friction in daily use with proactive planning

## Core Value Proposition

> **"Never be surprised by running out of money. See your future financial position every day."**

This is about **preventing payment failures** and **feeling safe**, not just tracking what happened.

---

## Current State vs. Desired State

### What You Already Have ✅
- Workspace management
- Account management
- Transaction tracking with reconciliation
- Category system
- Real-time balance updates
- Theme switching
- Basic onboarding flow

### What's Missing ❌
1. **Consistent access control** - Settings accessible without workspace
2. **Account requirement** - Can access transactions without accounts
3. **Future transactions** - Can't plan for upcoming expenses (CRITICAL)
4. **Month navigation** - Can't focus on specific month
5. **Daily cash flow forecast** - Don't know future financial position (CRITICAL)
6. **Risk awareness** - Don't see upcoming payment risks (CRITICAL)
7. **Spending analysis** - No proper trend calculations

---

## The Solution: Focused Implementation

### Phase 1: Critical Fixes + Future Planning (1 week - P0)
**Make the app safe and usable**

**Fixes (6 hours):**
- Fix settings access (always accessible) - 1 hour
- Add account requirement to transactions - 2 hours
- Enhance onboarding journey - 3 hours

**Future Planning (12 hours):**
- Database schema for planned transactions - 2 hours
- Transaction form updates (future dates) - 3 hours
- Balance calculation logic (exclude planned) - 3 hours
- UI for planned vs completed transactions - 2 hours
- Testing - 2 hours

**Month Navigation (8 hours):**
- Month selector component - 3 hours
- Transaction filtering by month - 2 hours
- URL state management - 2 hours
- Testing - 1 hour

**Total Phase 1:** 26 hours

---

### Phase 2: Financial Safety Dashboard (1 week - P0)
**Make users feel safe and in control**

**Daily Cash Flow Forecast (16 hours):**
- Forecast calculation engine - 4 hours
- Average daily spending algorithm - 2 hours
- Forecast chart component - 4 hours
- Risk level indicators - 2 hours
- Data caching and optimization - 2 hours
- Testing - 2 hours

**Upcoming Payments & Risks Widget (10 hours):**
- Risk assessment algorithm - 3 hours
- Widget component with risk indicators - 3 hours
- Quick actions (mark as paid) - 2 hours
- Testing - 2 hours

**Balance Overview Widget (4 hours):**
- Total balance calculation - 1 hour
- Account breakdown component - 2 hours
- Testing - 1 hour

**Total Phase 2:** 30 hours

---

### Phase 3: Spending Insights (3 days - P1)
**Help users understand their patterns**

**Spending Trends Analysis (12 hours):**
- Trend calculation engine - 4 hours
- Category comparison logic - 2 hours
- Trend visualization component - 3 hours
- Unusual pattern detection - 2 hours
- Testing - 1 hour

**Total Phase 3:** 12 hours

---

## Total Effort Estimate

| Phase | Duration | Hours | Priority | Value |
|-------|----------|-------|----------|-------|
| Phase 1 | 1 week | 26 | P0 | ⭐⭐⭐⭐ Usable + Planning |
| Phase 2 | 1 week | 30 | P0 | ⭐⭐⭐⭐⭐ Safety + Control |
| Phase 3 | 3 days | 12 | P1 | ⭐⭐⭐⭐ Insights |
| **Total** | **2 weeks** | **68** | - | **Production-ready** |

---

## Key Features Breakdown

### 1. Future Transaction Planning (P0 - CRITICAL)
**Problem:** Can't plan for upcoming expenses, always reactive
**Solution:** "Planned" status for future transactions
**Effort:** 12 hours
**Value:** ⭐⭐⭐⭐⭐ Essential for forecasting

**Features:**
- Transaction form allows future dates
- Planned transactions don't affect current balances
- Visual distinction (planned vs completed)
- Convert to completed when payment occurs
- Include in forecast calculations

---

### 2. Daily Cash Flow Forecast (P0 - CRITICAL)
**Problem:** Don't know if I'll have enough money in the future
**Solution:** Daily projected balance for selected month
**Effort:** 16 hours
**Value:** ⭐⭐⭐⭐⭐ Core safety feature

**Forecast Includes:**
- Current account balances (starting point)
- Completed transactions (historical)
- Planned transactions (scheduled)
- Average daily spending (learned from history)
- Risk indicators (safe/warning/danger days)

**Visual:**
```
Daily Cash Flow Forecast - February 2026

₴15,000 |                    ●────●
        |              ●────●
₴10,000 |        ●────●
        |  ●────●
₴5,000  |●                          ⚠️ Warning
        |                                ● Danger
₴0      |________________________________
        1  5  10  15  20  25  28

🟢 Safe Days: 20  🟡 Warning: 5  🔴 Risk: 3
```

---

### 3. Upcoming Payments & Risks Widget (P0 - CRITICAL)
**Problem:** Don't know what payments are coming and if I can afford them
**Solution:** List of upcoming planned transactions with risk assessment
**Effort:** 10 hours
**Value:** ⭐⭐⭐⭐⭐ Proactive awareness

**Features:**
- Shows next 30 days of planned transactions
- Risk indicators per payment:
  - 🟢 Green: Safe - sufficient balance
  - 🟡 Yellow: Warning - balance will be tight
  - 🔴 Red: Risk - insufficient balance
- Days until payment
- Quick action to mark as paid
- Total upcoming expenses summary
- Recommendations for high-risk payments

**Example:**
```
Upcoming Payments

🔴 Rent Payment          ₴8,000    in 3 days
   ⚠️ Insufficient funds. Need ₴1,200 more.

🟡 Utility Bill          ₴1,500    in 5 days
   ⚠️ Balance will be tight after payment.

🟢 Internet              ₴300      in 7 days
   ✓ Sufficient funds available.

Total Next 7 Days: ₴9,800
Total Next 30 Days: ₴15,400
```

---

### 4. Month-Based Navigation (P0)
**Problem:** Overwhelmed by all transactions
**Solution:** Month selector with filtering
**Effort:** 8 hours
**Value:** ⭐⭐⭐⭐ Focused workflow

**Features:**
- Dropdown: "February 2026 (45 transactions)"
- Previous/Next month buttons
- Quick jump to current month
- Forecast updates for selected month
- URL state preservation

---

### 5. Balance Overview Widget (P0)
**Problem:** Don't know total financial position
**Solution:** Total balance across all accounts
**Effort:** 4 hours
**Value:** ⭐⭐⭐⭐ Quick awareness

**Features:**
- Total balance (all accounts)
- Account-level breakdown
- Reconciliation status indicators
- Quick link to reconcile
- Debt vs Asset separation

---

### 6. Spending Trends Analysis (P1)
**Problem:** Don't understand spending patterns
**Solution:** Category-level trend analysis
**Effort:** 12 hours
**Value:** ⭐⭐⭐⭐ Insights for improvement

**Features:**
- Spending by category (selected month)
- Comparison to previous month (% change)
- Comparison to 3-month average
- Unusual spending detection
- Top 3 categories highlighted
- Average daily spending
- Trend indicators (↑↓→)

---

## Forecast Calculation Logic

### Daily Cash Flow Formula

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
```

### Risk Level Determination

```
Risk Level:
- 🔴 Danger:  Balance < ₴0
- 🟡 Warning: Balance < (7 days × Avg Daily Spending)
- 🟢 Safe:    Balance ≥ (7 days × Avg Daily Spending)
```

### Confidence Level

```
Confidence:
- High:   < 14 days in future + sufficient historical data
- Medium: 14-30 days in future + sufficient historical data
- Low:    > 30 days in future OR insufficient historical data
```

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  Family Dashboard                                    │
│  Workspace: My Family  |  February 2026 [▼]         │
└─────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────┐
│  Balance Overview        │  Upcoming Payments       │
│                          │                          │
│  Total: ₴12,450         │  🔴 Rent: ₴8,000 (3d)   │
│  ↑ +5% from last month  │  🟡 Bills: ₴1,500 (5d)  │
│                          │  🟢 Internet: ₴300 (7d)  │
│  [View Accounts]         │                          │
│                          │  Next 7d: ₴9,800         │
└──────────────────────────┴──────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Daily Cash Flow Forecast                           │
│                                                      │
│  [Chart showing projected balance per day]          │
│                                                      │
│  🟢 Safe: 20 days  🟡 Warning: 5 days  🔴 Risk: 3  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Spending Trends                                     │
│                                                      │
│  Top Categories:                                     │
│  1. Food & Dining    ₴3,200  ↓ -12% vs last month  │
│  2. Transportation   ₴1,800  → stable               │
│  3. Utilities        ₴1,500  ↑ +8% vs last month   │
│                                                      │
│  Avg Daily Spending: ₴285                           │
└─────────────────────────────────────────────────────┘
```

---

## Success Metrics

### Safety & Control
- Users check forecast before purchases: 60%+
- Users avoid payment failures: 95%+
- Users feel "safe and in control": 80%+

### Engagement
- Daily active users: +40%
- Users check upcoming payments daily: 50%+
- Future transaction planning adoption: 70%+

### Feature Adoption
- 90% create accounts in first session
- 70% enter first transaction in first day
- 80% add planned transaction in first week
- 60% check forecast 3x per week

---

## Risk Assessment

### Low Risk ✅
- All infrastructure exists
- No major architectural changes
- Incremental enhancements
- Can roll out with feature flags

### Medium Risk ⚠️
- Forecast calculation performance
- Historical data quality for predictions
- User understanding of forecast confidence

### Mitigation Strategies
- Cache forecast calculations (5-minute TTL)
- Show confidence levels clearly
- Provide tooltips explaining calculations
- Start with simple average, enhance later
- Monitor calculation performance
- Add database indexes for queries

---

## Implementation Priority

### Week 1: Fixes + Future Planning
1. Fix settings access (1h)
2. Add account requirement (2h)
3. Enhance onboarding (3h)
4. Future transaction schema (2h)
5. Transaction form updates (3h)
6. Balance calculation logic (3h)
7. Planned transaction UI (2h)
8. Month selector (8h)
9. Testing (2h)

**Deliverable:** Usable app with future planning capability

---

### Week 2: Financial Safety Dashboard
1. Forecast calculation engine (4h)
2. Average daily spending algorithm (2h)
3. Forecast chart component (4h)
4. Risk indicators (2h)
5. Caching and optimization (2h)
6. Upcoming payments widget (10h)
7. Balance overview widget (4h)
8. Testing (2h)

**Deliverable:** Complete safety and control system

---

### Week 3 (Optional): Spending Insights
1. Trend calculation engine (4h)
2. Category comparison logic (2h)
3. Trend visualization (3h)
4. Unusual pattern detection (2h)
5. Testing (1h)

**Deliverable:** Enhanced insights for decision-making

---

## Next Steps

1. **Review Requirements** - Confirm this matches your vision
2. **Approve Scope** - Agree on Phase 1 + Phase 2 as MVP
3. **Create Design** - Technical specifications and architecture
4. **Break Down Tasks** - Detailed task list for implementation
5. **Start Development** - Begin with fixes and future planning

---

## Questions Before Design Phase

1. **Forecast Complexity:** Should we start with simple average daily spending, or include more sophisticated patterns (weekday vs weekend, recurring bills)?

2. **Risk Thresholds:** Should danger threshold be ₴0, or should users be able to set their own minimum balance?

3. **Historical Data:** How many days of history required before showing forecast? (Suggest: 14 days minimum)

4. **Confidence Display:** Should we show confidence levels to users, or hide low-confidence forecasts?
   **ANSWER:** Hide low-confidence forecasts (don't show to users)

5. **Planned Transaction Limits:** Should there be a limit on how far in the future users can plan? (Suggest: 1 year)
   **ANSWER:** 6 months maximum planning horizon

6. **Average Calculation:** Should we exclude weekends/holidays from daily average, or treat all days equally?

---

## Recommendation

**Start with Phase 1 + Phase 2 (2 weeks)**

This delivers the complete safety and control system:
- ✅ Fixes and consistent UX
- ✅ Future transaction planning
- ✅ Month-based navigation
- ✅ Daily cash flow forecast
- ✅ Upcoming payments with risk assessment
- ✅ Balance overview

**Result:** A production-ready app that prevents payment failures and makes users feel safe and in control.

**Phase 3 (Spending Insights)** can be added later based on user feedback and usage patterns.
