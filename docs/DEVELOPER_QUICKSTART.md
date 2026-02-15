# Developer Quick Start Guide

## Getting Started with Forecast Development

This guide helps developers quickly understand and work with the forecast system.

---

## Quick Reference

### Key Files

```
src/lib/calculations/
├── average-daily-spending.ts    # Historical spending analysis
├── daily-forecast.ts            # Daily balance projections
└── payment-risk-assessment.ts   # Payment risk evaluation

src/lib/services/
└── forecast-service.ts          # Data fetching + caching

src/actions/
└── forecast.ts                  # Server actions for client

src/components/forecast/
├── daily-forecast-chart.tsx     # Chart visualization
└── upcoming-payments-widget.tsx # Payment risk display
```

### Core Functions

```typescript
// 1. Calculate average daily spending
import { calculateAverageDailySpending } from '@/lib/calculations/average-daily-spending'

const result = calculateAverageDailySpending(transactions)
// Returns: {averageDailySpending, confidence, daysAnalyzed, ...}

// 2. Calculate daily forecast
import { calculateDailyForecast } from '@/lib/calculations/daily-forecast'

const forecast = calculateDailyForecast(
  currentBalance,
  historicalTransactions,
  plannedTransactions,
  '2026-02-01',
  '2026-02-28',
  { minimumSafeBalance: 1000, safetyBufferDays: 7 }
)
// Returns: {forecasts[], averageDailySpending, confidence, shouldDisplay}

// 3. Assess payment risks
import { assessPaymentRisks } from '@/lib/calculations/payment-risk-assessment'

const risks = assessPaymentRisks(
  plannedTransactions,
  forecast.forecasts,
  forecast.averageDailySpending,
  7  // safety buffer days
)
// Returns: PaymentRisk[] sorted by urgency
```

---

## Common Tasks

### Task 1: Add New Risk Level

**File**: `src/lib/calculations/daily-forecast.ts`

```typescript
// Add new risk level to type
export type RiskLevel = 'safe' | 'warning' | 'danger' | 'critical'

// Update determineRiskLevel function
function determineRiskLevel(
  balance: number,
  settings: UserSettings,
  averageDailySpending: number
): RiskLevel {
  const criticalThreshold = settings.minimumSafeBalance * 0.5
  
  if (balance < criticalThreshold) {
    return 'critical'  // New level
  }
  
  if (balance < settings.minimumSafeBalance) {
    return 'danger'
  }
  
  // ... rest of logic
}
```

**Update UI**: Add color for new risk level in chart component.

---

### Task 2: Change Conservative Multiplier

**File**: `src/lib/calculations/daily-forecast.ts`

```typescript
// Current: 10% safety margin
const conservativeMultiplier = 1.1

// Change to 15% safety margin
const conservativeMultiplier = 1.15

// Or make it configurable
export interface UserSettings {
  minimumSafeBalance: number
  safetyBufferDays?: number
  conservativeMultiplier?: number  // Add this
}

// Use in calculation
const conservativeMultiplier = userSettings.conservativeMultiplier ?? 1.1
const conservativeDailySpending = spendingResult.averageDailySpending * conservativeMultiplier
```

---

### Task 3: Adjust Outlier Threshold

**File**: `src/lib/calculations/average-daily-spending.ts`

```typescript
// Current: 3× median
export function calculateAverageDailySpending(
  transactions: SpendingTransaction[],
  outlierThreshold: number = 3  // Change this default
): AverageDailySpendingResult {
  // ...
  const threshold = medianAmount * outlierThreshold
  // ...
}

// Usage with custom threshold
const result = calculateAverageDailySpending(transactions, 2.5)  // More aggressive
```

---

### Task 4: Add Weekday/Weekend Patterns

**File**: Create `src/lib/calculations/weekday-spending.ts`

```typescript
import { calculateAverageDailySpending } from './average-daily-spending'

export function calculateWeekdayWeekendSpending(
  transactions: SpendingTransaction[]
) {
  // Separate weekday and weekend transactions
  const weekdayTransactions = transactions.filter(t => {
    const day = new Date(t.transaction_date).getDay()
    return day >= 1 && day <= 5  // Monday-Friday
  })
  
  const weekendTransactions = transactions.filter(t => {
    const day = new Date(t.transaction_date).getDay()
    return day === 0 || day === 6  // Saturday-Sunday
  })
  
  // Calculate separate averages
  const weekdayResult = calculateAverageDailySpending(weekdayTransactions)
  const weekendResult = calculateAverageDailySpending(weekendTransactions)
  
  return {
    weekday: weekdayResult.averageDailySpending,
    weekend: weekendResult.averageDailySpending,
    confidence: Math.min(weekdayResult.confidence, weekendResult.confidence)
  }
}
```

**Update daily forecast** to use appropriate spending rate based on day of week.

---

### Task 5: Add Category-Based Forecasting

**File**: Create `src/lib/calculations/category-forecast.ts`

```typescript
export interface CategorySpending {
  categoryId: string
  categoryName: string
  averageDailySpending: number
  confidence: 'high' | 'medium' | 'low' | 'none'
}

export function calculateCategorySpending(
  transactions: SpendingTransaction[]
): CategorySpending[] {
  // Group by category
  const byCategory = transactions.reduce((acc, t) => {
    if (!acc[t.category_id]) {
      acc[t.category_id] = []
    }
    acc[t.category_id].push(t)
    return acc
  }, {} as Record<string, SpendingTransaction[]>)
  
  // Calculate average for each category
  return Object.entries(byCategory).map(([categoryId, txns]) => {
    const result = calculateAverageDailySpending(txns)
    return {
      categoryId,
      categoryName: txns[0].category_name,
      averageDailySpending: result.averageDailySpending,
      confidence: result.confidence
    }
  })
}
```

---

### Task 6: Invalidate Cache on Transaction Change

**File**: `src/actions/transactions.ts`

```typescript
import { forecastService } from '@/lib/services/forecast-service'

export async function createTransaction(formData: FormData) {
  // ... create transaction logic
  
  // Invalidate forecast cache
  forecastService.invalidateCache(workspaceId, accountId)
  
  return { data: transaction }
}

export async function updateTransaction(id: string, formData: FormData) {
  // ... update transaction logic
  
  // Invalidate forecast cache
  forecastService.invalidateCache(workspaceId, accountId)
  
  return { data: transaction }
}

export async function deleteTransaction(id: string) {
  // ... delete transaction logic
  
  // Invalidate forecast cache
  forecastService.invalidateCache(workspaceId, accountId)
  
  return { success: true }
}
```

---

## Testing

### Unit Test Example

```typescript
// tests/unit/calculations/average-daily-spending.test.ts
import { describe, it, expect } from 'vitest'
import { calculateAverageDailySpending } from '@/lib/calculations/average-daily-spending'

describe('calculateAverageDailySpending', () => {
  it('should calculate average correctly', () => {
    const transactions = [
      { amount: 100, transaction_date: '2026-01-01', type: 'expense' },
      { amount: 150, transaction_date: '2026-01-15', type: 'expense' },
      { amount: 200, transaction_date: '2026-01-30', type: 'expense' },
    ]
    
    const result = calculateAverageDailySpending(transactions)
    
    expect(result.averageDailySpending).toBeCloseTo(15, 1)  // 450 / 30 days
    expect(result.confidence).toBe('high')
    expect(result.daysAnalyzed).toBe(30)
  })
  
  it('should exclude outliers', () => {
    const transactions = [
      { amount: 50, transaction_date: '2026-01-01', type: 'expense' },
      { amount: 60, transaction_date: '2026-01-05', type: 'expense' },
      { amount: 2000, transaction_date: '2026-01-10', type: 'expense' },  // Outlier
      { amount: 55, transaction_date: '2026-01-15', type: 'expense' },
    ]
    
    const result = calculateAverageDailySpending(transactions)
    
    expect(result.transactionsExcluded).toBe(1)
    expect(result.averageDailySpending).toBeLessThan(100)  // Without outlier
  })
})
```

### Integration Test Example

```typescript
// tests/integration/calculations/forecast-integration.test.ts
import { describe, it, expect } from 'vitest'
import { forecastService } from '@/lib/services/forecast-service'

describe('Forecast Service Integration', () => {
  it('should fetch and calculate forecast', async () => {
    const forecast = await forecastService.getForecast(
      'test-workspace-id',
      'test-account-id',
      {
        startDate: '2026-02-01',
        endDate: '2026-02-28'
      }
    )
    
    expect(forecast.forecast.forecasts).toHaveLength(28)
    expect(forecast.currentBalance).toBeGreaterThan(0)
    expect(forecast.paymentRisks).toBeInstanceOf(Array)
  })
  
  it('should use cache on second call', async () => {
    const start = Date.now()
    
    // First call (cache miss)
    await forecastService.getForecast('workspace-id', 'account-id', {...})
    const firstCallTime = Date.now() - start
    
    // Second call (cache hit)
    const start2 = Date.now()
    await forecastService.getForecast('workspace-id', 'account-id', {...})
    const secondCallTime = Date.now() - start2
    
    expect(secondCallTime).toBeLessThan(firstCallTime * 0.1)  // 10x faster
  })
})
```

---

## Debugging

### Enable Debug Logging

```typescript
// src/lib/calculations/daily-forecast.ts

const DEBUG = process.env.DEBUG_FORECAST === 'true'

export function calculateDailyForecast(...) {
  if (DEBUG) {
    console.log('Calculating forecast:', {
      currentBalance,
      startDate,
      endDate,
      historicalTransactions: historicalTransactions.length,
      plannedTransactions: plannedTransactions.length
    })
  }
  
  // ... calculation logic
  
  if (DEBUG) {
    console.log('Forecast result:', {
      forecastCount: forecasts.length,
      averageDailySpending,
      confidence: spendingConfidence,
      shouldDisplay
    })
  }
  
  return result
}
```

**Usage**:
```bash
DEBUG_FORECAST=true npm run dev
```

### Inspect Cache

```typescript
// In browser console or server action
import { forecastService } from '@/lib/services/forecast-service'

// Check cache contents
console.log('Cache size:', forecastService['cache'].size)

// Clear cache
forecastService.clearCache()
```

---

## Performance Tips

### 1. Limit Historical Data

```typescript
// Only fetch last 90 days (not all history)
const ninetyDaysAgo = new Date()
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

const { data } = await supabase
  .from('transactions')
  .select('*')
  .gte('transaction_date', ninetyDaysAgo.toISOString().split('T')[0])
```

### 2. Use Database Indexes

```sql
-- Add indexes for forecast queries
CREATE INDEX idx_transactions_forecast 
ON transactions(workspace_id, account_id, is_expected, transaction_date);
```

### 3. Batch Calculations

```typescript
// Calculate forecasts for multiple accounts in parallel
const forecasts = await Promise.all(
  accountIds.map(id => 
    forecastService.getForecast(workspaceId, id, options)
  )
)
```

### 4. Optimize Cache TTL

```typescript
// Adjust based on usage patterns
private readonly CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes (default)
// For high-frequency updates: 1 * 60 * 1000  // 1 minute
// For stable data: 15 * 60 * 1000  // 15 minutes
```

---

## Common Errors

### Error: "Insufficient data"

**Cause**: Less than 14 days of historical transactions

**Solution**: 
```typescript
if (result.confidence === 'none') {
  return (
    <div>
      <p>Add at least 14 days of transactions to see forecast</p>
      <Button onClick={handleAddTransaction}>Add Transaction</Button>
    </div>
  )
}
```

### Error: "Unable to calculate - insufficient forecast data"

**Cause**: Payment date outside forecast period

**Solution**: Extend forecast period to include payment date
```typescript
const endDate = max(
  endOfMonth(selectedMonth),
  ...plannedTransactions.map(t => t.planned_date)
)
```

### Error: Cache not invalidating

**Cause**: Forgot to call `invalidateCache()` after transaction change

**Solution**: Add to all transaction mutations
```typescript
// After any transaction change
forecastService.invalidateCache(workspaceId, accountId)
```

---

## Resources

- **[Forecast API Documentation](FORECAST_API.md)**: Complete API reference
- **[Calculation Logic Guide](CALCULATION_LOGIC.md)**: Mathematical details
- **[Test Files](../tests/unit/calculations/)**: Unit test examples
- **[Integration Tests](../tests/integration/calculations/)**: Integration test examples

---

## Need Help?

1. Check the [Forecast API Documentation](FORECAST_API.md)
2. Review [Calculation Logic Guide](CALCULATION_LOGIC.md)
3. Look at test files for examples
4. Check steering files in `.kiro/steering/`
5. Review spec files in `.kiro/specs/user-journey-enhancement/`
