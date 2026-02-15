# User Journey & Financial Safety Enhancement - Tasks

## Overview

Implementation tasks for the financial safety and forecast system. Tasks are organized by priority and dependencies.

**Total Estimated Time:** 68 hours (~2 weeks)

---

## Phase 1: Critical Fixes + Future Planning (26 hours)

### 1. Access Control Fixes (6 hours)

- [x] 1.1 Remove workspace requirement from settings page (1 hour)
  - Update settings page to always be accessible
  - Keep workspace-specific settings behind workspace check
  - Test with and without workspace

- [x] 1.2 Add account requirement to transactions page (2 hours)
  - Create AccountRequirementGate component
  - Show "Create Account First" message when no accounts
  - Add quick account creation flow
  - Test with workspace but no accounts

- [x] 1.3 Enhance onboarding journey (3 hours)
  - Update OnboardingFlow component with clearer steps
  - Add progress indicators
  - Improve messaging for each state
  - Test complete onboarding flow

### 2. Database Schema Changes (4 hours)

- [x] 2.1 Create migration for transaction status field (1 hour)
  - Add `status` column with CHECK constraint
  - Add `planned_date` column with 6-month constraint (max 6 months ahead)
  - Add `completed_at` column
  - Add indexes for performance

- [x] 2.2 Create user_settings table migration (1 hour)
  - Create table with RLS policies
  - Add minimum_safe_balance field
  - Add safety_buffer_days field
  - Add indexes

- [x] 2.3 Backfill existing data (1 hour)
  - Set all existing transactions to 'completed'
  - Set completed_at from created_at
  - Verify data integrity

- [x] 2.4 Test migrations (1 hour)
  - Test on development database
  - Verify constraints work correctly
  - Test rollback if needed
  - Generate TypeScript types

### 3. Future Transaction Capability (12 hours)

- [x] 3.1 Update transaction form for future dates (3 hours)
  - Add date picker with 6-month max (not 1 year)
  - Auto-detect planned vs completed based on date
  - Show status indicator
  - Add explanatory text
  - Test form validation

- [x] 3.2 Update balance calculation logic (3 hours)
  - Modify getAccounts to exclude planned transactions
  - Update account_actual_balances view
  - Ensure planned transactions don't affect current balance
  - Add unit tests for balance calculations

- [x] 3.3 Create planned transaction UI components (2 hours)
  - Add visual distinction (badge, icon)
  - Create filter for planned vs completed
  - Add "Mark as Paid" action
  - Test UI states

- [x] 3.4 Implement markPlannedAsCompleted action (2 hours)
  - Create server action
  - Add validation and access control
  - Invalidate forecast cache
  - Add error handling

- [x] 3.5 Testing (2 hours)
  - Unit tests for status logic
  - Integration tests for conversion
  - E2E test for complete flow
  - Test edge cases

### 4. Month Navigation (8 hours)

- [x] 4.1 Create MonthSelector component (3 hours)
  - Build dropdown with month options
  - Add previous/next buttons
  - Add "Today" quick jump
  - Show transaction counts per month
  - Style with Executive Lounge aesthetic

- [x] 4.2 Implement month filtering logic (2 hours)
  - Update transaction queries to filter by month
  - Add URL state management
  - Preserve selected month in navigation
  - Test filtering accuracy

- [x] 4.3 Integrate with transaction page (2 hours)
  - Add MonthSelector to page header
  - Connect to transaction list
  - Update forecast to use selected month
  - Test month switching

- [x] 4.4 Testing (1 hour)
  - Test month navigation
  - Test URL state persistence
  - Test transaction count accuracy
  - E2E test for month switching

---

## Phase 2: Financial Safety Dashboard (30 hours)

### 5. Calculation Engine (12 hours)

- [x] 5.1 Implement average daily spending calculator (4 hours)
  - Create calculateAverageDailySpending function
  - Implement one-time large purchase exclusion
  - Add 14-day minimum data requirement
  - Return confidence level
  - Add comprehensive unit tests

- [x] 5.2 Implement daily forecast calculator (4 hours)
  - Create calculateDailyForecast function
  - Apply conservative multiplier (1.1x)
  - Calculate risk levels with user-defined threshold
  - Hide low-confidence forecasts
  - Add comprehensive unit tests

- [x] 5.3 Implement payment risk assessment (2 hours)
  - Create assessPaymentRisks function
  - Calculate balance after each payment
  - Generate recommendations
  - Sort by urgency
  - Add unit tests

- [x] 5.4 Integration testing (2 hours)
  - Test complete forecast flow
  - Test with various data scenarios
  - Test edge cases (no data, insufficient data)
  - Verify calculations are conservative

### 6. Data Service Layer (6 hours)

- [x] 6.1 Create ForecastService class (3 hours)
  - Implement data fetching methods
  - Add 5-minute caching with TTL
  - Implement cache invalidation
  - Add error handling
  - Test caching behavior

- [x] 6.2 Create getForecast server action (2 hours)
  - Implement access control
  - Fetch user settings for thresholds
  - Call calculation engine
  - Return formatted results
  - Add error handling

- [x] 6.3 Testing (1 hour)
  - Test access control
  - Test caching
  - Test error scenarios
  - Integration tests

### 7. UI Components (12 hours)

- [x] 7.1 Create DailyForecastChart component (4 hours)
  - Implement chart with Chart.js/Recharts
  - Color code by risk level
  - Add tooltips with breakdown
  - Show summary stats (safe/warning/danger days)
  - Style with Executive Lounge aesthetic
  - Test responsiveness

- [x] 7.2 Create UpcomingPaymentsWidget component (4 hours)
  - Display list of upcoming payments
  - Show risk indicators (🟢🟡🔴)
  - Add "Mark as Paid" buttons
  - Show totals (7-day, 30-day)
  - Add loading and error states
  - Test interactions

- [x] 7.3 Create BalanceOverviewWidget component (2 hours)
  - Show total balance across accounts
  - Display account breakdown
  - Show reconciliation status
  - Add quick links
  - Style consistently

- [x] 7.4 Create UserSettingsForm component (2 hours)
  - Add minimum safe balance input
  - Add safety buffer days input
  - Save to user_settings table
  - Show current settings
  - Add validation

---

## Phase 3: Spending Insights (12 hours)

### 8. Spending Trends Analysis (12 hours)

- [x] 8.1 Implement trend calculation logic (4 hours)
  - Create calculateSpendingTrends function
  - Calculate month-over-month changes
  - Calculate 3-month averages
  - Detect unusual patterns
  - Add unit tests

- [x] 8.2 Create SpendingTrendsWidget component (4 hours)
  - Display top categories
  - Show percentage changes
  - Add trend indicators (↑↓→)
  - Highlight unusual spending
  - Style with charts/visualizations

- [x] 8.3 Integrate with dashboard (2 hours)
  - Add to dashboard layout
  - Connect to data service
  - Add loading states
  - Test with real data

- [x] 8.4 Testing (2 hours)
  - Test calculations
  - Test UI rendering
  - Test edge cases
  - E2E tests

---

## Phase 4: Integration & Polish (Additional tasks as needed)

### 9. Dashboard Integration

- [x] 9.1 Update dashboard layout
  - Arrange widgets in grid
  - Add responsive breakpoints
  - Ensure mobile-friendly
  - Test on all screen sizes

- [x] 9.2 Add loading states
  - Skeleton loaders for widgets
  - Loading indicators
  - Error boundaries
  - Retry mechanisms

- [x] 9.3 Add empty states
  - "No data yet" messages
  - "Add transactions" prompts
  - Helpful guidance
  - Call-to-action buttons

### 10. Testing & Quality Assurance

- [x] 10.1 Unit test coverage
  - Achieve >90% coverage for calculations
  - Test all edge cases
  - Test error scenarios
  - Document test cases

- [x] 10.2 Integration tests
  - Test complete forecast flow
  - Test data fetching
  - Test caching
  - Test access control

- [x] 10.3 E2E tests
  - Test user journeys
  - Test forecast viewing
  - Test planned transactions
  - Test month navigation

- [x] 10.4 Performance testing
  - Measure calculation times
  - Test with large datasets
  - Verify caching effectiveness
  - Optimize slow queries

### 11. Documentation

- [x] 11.1 User documentation
  - Add tooltips to UI
  - Create help text
  - Explain calculations
  - Add FAQ section

- [x] 11.2 Developer documentation
  - Document calculation logic
  - Add code comments
  - Update README
  - Document API endpoints

### 12. Deployment

- [x] 12.1 Feature flags
  - Add FEATURE_FUTURE_TRANSACTIONS flag
  - Add FEATURE_DAILY_FORECAST flag
  - Add FEATURE_PAYMENT_RISKS flag
  - Test flag toggling

- [x] 12.2 Database migrations
  - Apply to development
  - Test thoroughly
  - Prepare rollback plan
  - Apply to production

- [x] 12.3 Monitoring
  - Add logging for calculations
  - Track error rates
  - Monitor performance
  - Set up alerts

- [x] 12.4 Gradual rollout
  - Deploy with flags off
  - Enable for internal testing
  - Enable for beta users
  - Full rollout

---

## Task Dependencies

```
Phase 1 (Fixes + Future Planning)
├── 1. Access Control Fixes (no dependencies)
├── 2. Database Schema Changes (no dependencies)
├── 3. Future Transaction Capability (depends on 2)
└── 4. Month Navigation (no dependencies)

Phase 2 (Financial Safety Dashboard)
├── 5. Calculation Engine (depends on Phase 1.2, 1.3)
├── 6. Data Service Layer (depends on 5)
└── 7. UI Components (depends on 6)

Phase 3 (Spending Insights)
└── 8. Spending Trends (depends on Phase 2.5, 2.6)

Phase 4 (Integration & Polish)
├── 9. Dashboard Integration (depends on Phase 2.7)
├── 10. Testing (ongoing)
├── 11. Documentation (ongoing)
└── 12. Deployment (depends on all phases)
```

---

## Priority Levels

**P0 (Must Have):**
- All of Phase 1 (Fixes + Future Planning)
- All of Phase 2 (Financial Safety Dashboard)

**P1 (Should Have):**
- Phase 3 (Spending Insights)

**P2 (Nice to Have):**
- Advanced visualizations
- Export capabilities
- Custom notifications

---

## Testing Checklist

### Unit Tests
- [ ] Average daily spending calculation
- [ ] Daily forecast calculation
- [ ] Payment risk assessment
- [ ] Balance calculation logic
- [ ] Spending trends calculation

### Integration Tests
- [ ] Forecast data fetching
- [ ] Cache invalidation
- [ ] Transaction status conversion
- [ ] User settings management

### E2E Tests
- [ ] Complete onboarding flow
- [ ] Add planned transaction
- [ ] Mark planned as completed
- [ ] View forecast chart
- [ ] Change month selection
- [ ] Update user settings

---

## Success Criteria

### Technical
- [ ] All calculations tested with >90% coverage
- [ ] Forecast calculation time < 2 seconds
- [ ] Cache hit rate > 80%
- [ ] Error rate < 0.5%
- [ ] No data integrity issues

### User Experience
- [ ] Users understand forecast (verified through testing)
- [ ] Forecast is accurate (within 10% of actual)
- [ ] Users can easily add planned transactions
- [ ] Month navigation is intuitive
- [ ] Risk indicators are clear

### Performance
- [ ] Dashboard loads in < 3 seconds
- [ ] Forecast updates in < 1 second
- [ ] No UI blocking during calculations
- [ ] Smooth animations and transitions

---

## Notes

- All tasks should follow autonomous deployment practices
- Use feature flags for gradual rollout
- Prioritize data integrity and accuracy
- Test thoroughly before enabling features
- Monitor performance and error rates
- Gather user feedback continuously
