# Feature Flags Guide

## Overview

Feature flags enable gradual rollout of new features, allowing us to deploy code to production while keeping features disabled until they're ready for users.

## User Journey Enhancement Feature Flags

The following feature flags control the user journey enhancement features:

### FUTURE_TRANSACTIONS
- **Environment Variable**: `NEXT_PUBLIC_FEATURE_FUTURE_TRANSACTIONS`
- **Description**: Plan and schedule future transactions without affecting current balance
- **Dependencies**: Database migration for transaction status field
- **Usage**: Controls ability to create planned transactions with future dates

### DAILY_FORECAST
- **Environment Variable**: `NEXT_PUBLIC_FEATURE_DAILY_FORECAST`
- **Description**: See projected daily balances to avoid running out of money
- **Dependencies**: FUTURE_TRANSACTIONS, calculation engine
- **Usage**: Controls display of daily cash flow forecast chart on dashboard

### PAYMENT_RISKS
- **Environment Variable**: `NEXT_PUBLIC_FEATURE_PAYMENT_RISKS`
- **Description**: Get warnings about upcoming payments that may cause insufficient funds
- **Dependencies**: FUTURE_TRANSACTIONS, DAILY_FORECAST
- **Usage**: Controls display of upcoming payments widget with risk indicators

## Configuration

### Development Environment

Add to `.env.local`:

```bash
# Enable all user journey features for development
NEXT_PUBLIC_FEATURE_FUTURE_TRANSACTIONS=true
NEXT_PUBLIC_FEATURE_DAILY_FORECAST=true
NEXT_PUBLIC_FEATURE_PAYMENT_RISKS=true
```

### Production Environment

Set in Vercel dashboard or deployment configuration:

```bash
# Gradual rollout - enable features one by one
NEXT_PUBLIC_FEATURE_FUTURE_TRANSACTIONS=true
NEXT_PUBLIC_FEATURE_DAILY_FORECAST=false
NEXT_PUBLIC_FEATURE_PAYMENT_RISKS=false
```

## Usage in Code

### Using FeatureGate Component

```tsx
import { FeatureGate } from '@/components/shared/feature-gate'

// Simple usage - hide feature when disabled
<FeatureGate feature="FUTURE_TRANSACTIONS">
  <FutureTransactionForm />
</FeatureGate>

// With fallback content
<FeatureGate 
  feature="DAILY_FORECAST"
  fallback={<div>Feature coming soon!</div>}
>
  <DailyForecastChart />
</FeatureGate>

// With automatic "Coming Soon" message
<FeatureGate 
  feature="PAYMENT_RISKS"
  showComingSoon={true}
>
  <PaymentRisksWidget />
</FeatureGate>
```

### Using isFeatureEnabled Function

```tsx
import { isFeatureEnabled } from '@/config/feature-flags'

function TransactionForm() {
  const canScheduleFuture = isFeatureEnabled('FUTURE_TRANSACTIONS')
  
  return (
    <form>
      {/* ... other fields ... */}
      
      {canScheduleFuture && (
        <div>
          <label>Schedule for future date</label>
          <DatePicker maxDate={addMonths(new Date(), 6)} />
        </div>
      )}
    </form>
  )
}
```

### Using useFeatureFlag Hook

```tsx
import { useFeatureFlag } from '@/components/shared/feature-gate'

function Dashboard() {
  const showForecast = useFeatureFlag('DAILY_FORECAST')
  const showRisks = useFeatureFlag('PAYMENT_RISKS')
  
  return (
    <div className="grid gap-6">
      <BalanceOverview />
      
      {showForecast && <DailyForecastChart />}
      {showRisks && <PaymentRisksWidget />}
      
      <RecentTransactions />
    </div>
  )
}
```

### Server-Side Usage

```tsx
// In Server Components or Server Actions
import { isFeatureEnabled } from '@/config/feature-flags'

export async function createTransaction(formData: FormData) {
  const canScheduleFuture = isFeatureEnabled('FUTURE_TRANSACTIONS')
  
  // Validate based on feature flag
  if (!canScheduleFuture && isFutureDate(formData.get('date'))) {
    return { error: 'Future transactions are not yet available' }
  }
  
  // ... rest of logic
}
```

## Gradual Rollout Strategy

See [GRADUAL_ROLLOUT_PLAN.md](./GRADUAL_ROLLOUT_PLAN.md) for the complete rollout strategy.

### Quick Reference

**Phase 1: Database Migration (Week 1)**
- Deploy with all flags OFF
- Verify migration successful
- Monitor for issues

**Phase 2: Internal Testing (Week 2)**
- Enable all flags in preview environment
- Internal team testing
- Fix bugs and iterate

**Phase 3: Beta Testing (Week 3-4)**
- Enable for 10-20 beta users
- Gather feedback
- Validate calculations

**Phase 4: Gradual Production Rollout (Week 5-6)**
- 10% → 25% → 50% → 75% → 100%
- Monitor at each milestone
- Communicate with users

**Phase 5: Post-Rollout (Week 7+)**
- Ongoing monitoring
- Continuous improvement
- Success measurement

### Percentage-Based Rollout

For gradual production rollout, use the rollout percentage environment variable:

```bash
# Enable for specific percentage of users
NEXT_PUBLIC_FEATURE_ROLLOUT_PERCENTAGE=10  # 10% of users
NEXT_PUBLIC_FEATURE_ROLLOUT_PERCENTAGE=25  # 25% of users
NEXT_PUBLIC_FEATURE_ROLLOUT_PERCENTAGE=50  # 50% of users
NEXT_PUBLIC_FEATURE_ROLLOUT_PERCENTAGE=100 # All users
```

### User-Based Rollout (Beta Testing)

For beta testing with specific users:

```typescript
// src/lib/feature-flags/user-flags.ts
const BETA_USER_IDS = [
  'user-id-1',
  'user-id-2',
  // ... beta user IDs
]

export function isFeatureEnabledForUser(
  feature: FeatureFlag,
  userId: string
): boolean {
  // Check global flag first
  if (!FEATURE_FLAGS[feature]) {
    return false
  }
  
  // Check if user is in beta
  return BETA_USER_IDS.includes(userId)
}
```

## Testing Feature Flags

### Unit Tests

```tsx
import { describe, it, expect, vi } from 'vitest'
import * as featureFlags from '@/config/feature-flags'

describe('Feature-gated component', () => {
  it('shows feature when enabled', () => {
    vi.spyOn(featureFlags, 'isFeatureEnabled').mockReturnValue(true)
    
    // Test with feature enabled
  })
  
  it('hides feature when disabled', () => {
    vi.spyOn(featureFlags, 'isFeatureEnabled').mockReturnValue(false)
    
    // Test with feature disabled
  })
})
```

### E2E Tests

```tsx
// Set environment variable before tests
process.env.NEXT_PUBLIC_FEATURE_FUTURE_TRANSACTIONS = 'true'

test('can create future transaction when flag enabled', async ({ page }) => {
  // Test future transaction creation
})
```

## Monitoring

### Metrics to Track

1. **Feature Adoption**
   - % of users using future transactions
   - Average number of planned transactions per user
   - Forecast view frequency

2. **Performance**
   - Forecast calculation time
   - Cache hit rate
   - Error rates

3. **User Behavior**
   - Payment failures avoided
   - Forecast accuracy
   - User satisfaction scores

### Logging

```tsx
// Log feature flag usage for analytics
logger.info('Feature accessed', {
  feature: 'DAILY_FORECAST',
  userId: user.id,
  enabled: isFeatureEnabled('DAILY_FORECAST')
})
```

## Troubleshooting

### Feature Not Showing

1. Check environment variable is set to `'true'` (string, not boolean)
2. Verify environment variable name matches exactly
3. Restart development server after changing `.env.local`
4. Check browser console for errors

### Feature Showing When It Shouldn't

1. Verify environment variable is NOT set or set to anything other than `'true'`
2. Clear browser cache
3. Check for hardcoded overrides in code

### Tests Failing

1. Ensure tests mock feature flags correctly
2. Check test environment variables
3. Verify test isolation (flags not leaking between tests)

## Best Practices

1. **Always Use Feature Gates**: Never check environment variables directly
2. **Provide Fallbacks**: Show helpful messages when features are disabled
3. **Test Both States**: Test with feature enabled AND disabled
4. **Document Dependencies**: Note which features depend on others
5. **Monitor Rollout**: Track metrics during gradual rollout
6. **Clean Up**: Remove feature flags once fully rolled out

## Removing Feature Flags

Once a feature is fully rolled out and stable:

1. Remove the feature flag check from code
2. Remove the environment variable
3. Remove from `FEATURE_FLAGS` constant
4. Remove from `FEATURE_METADATA`
5. Update documentation
6. Remove related tests

## Related Documentation

- [Feature Flags Steering Guide](.kiro/steering/feature-flags.md)
- [User Journey Enhancement Spec](.kiro/specs/user-journey-enhancement/)
- [Deployment Process](./DEPLOYMENT.md)
