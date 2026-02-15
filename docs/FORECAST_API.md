# Forecast API Documentation

## Overview

The Forecast API provides daily cash flow projections and payment risk assessments based on historical spending patterns and planned transactions. This system helps users avoid running out of money by showing their projected balance for each day.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Components                        │
│  (DailyForecastChart, UpcomingPaymentsWidget, etc.)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server Actions                             │
│              (getForecast, etc.)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Forecast Service                            │
│         (Data fetching + Caching layer)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Calculation Engine                             │
│  ┌──────────────────┬──────────────────┬─────────────────┐ │
│  │ Average Daily    │ Daily Forecast   │ Payment Risk    │ │
│  │ Spending         │ Calculator       │ Assessment      │ │
│  └──────────────────┴──────────────────┴─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Average Daily Spending Calculator

**Location**: `src/lib/calculations/average-daily-spending.ts`

Calculates average daily spending from historical transactions with outlier exclusion.

#### Function: `calculateAverageDailySpending`

```typescript
function calculateAverageDailySpending(
  transactions: SpendingTransaction[],
  outlierThreshold?: number
): AverageDailySpendingResult
```

**Purpose**: Calculate realistic daily spending estimate by analyzing historical expense transactions.

**Algorithm**:
1. Filter for expense transactions only
2. Calculate date range (min to max transaction date)
3. Check minimum data requirement (14 days)
4. Calculate median transaction amount
5. Exclude outliers (transactions > 3x median by default)
6. Calculate average: `totalSpending / daysAnalyzed`
7. Determine confidence level based on days analyzed

**Parameters**:
- `transactions`: Array of historical transactions with `amount`, `transaction_date`, and `type`
- `outlierThreshold`: Multiplier for median to identify outliers (default: 3)

**Returns**:
```typescript
{
  averageDailySpending: number      // Average daily spending amount
  confidence: 'high' | 'medium' | 'low' | 'none'
  daysAnalyzed: number              // Number of days in date range
  transactionsIncluded: number      // Transactions used in calculation
  transactionsExcluded: number      // Outliers excluded
  totalSpending: number             // Total spending analyzed
  medianAmount: number              // Median transaction amount
}
```

**Confidence Levels**:
- `high`: 30+ days of data
- `medium`: 14-29 days of data
- `low`: All transactions were outliers
- `none`: Less than 14 days of data

**Example**:
```typescript
const result = calculateAverageDailySpending(transactions)

if (result.confidence !== 'none') {
  console.log(`Average daily spending: ₴${result.averageDailySpending.toFixed(2)}`)
  console.log(`Based on ${result.daysAnalyzed} days of data`)
  console.log(`Excluded ${result.transactionsExcluded} outliers`)
}
```

---

### 2. Daily Forecast Calculator

**Location**: `src/lib/calculations/daily-forecast.ts`

Projects future account balances with conservative estimates and risk assessment.

#### Function: `calculateDailyForecast`

```typescript
function calculateDailyForecast(
  currentBalance: number,
  historicalTransactions: SpendingTransaction[],
  plannedTransactions: PlannedTransaction[],
  startDate: string,
  endDate: string,
  userSettings: UserSettings
): ForecastResult
```

**Purpose**: Calculate daily balance projections for a date range, including risk assessment.

**Algorithm**:
1. Calculate average daily spending from historical data
2. Apply conservative multiplier (1.1x = 10% safety margin)
3. For each day in range:
   - Start with previous day's ending balance
   - Add planned income for the day
   - Subtract planned expenses for the day
   - Subtract estimated daily spending
   - Calculate ending balance
   - Determine risk level based on user's minimum safe balance
   - Determine confidence based on data quality and days in future
4. Return array of daily forecasts

**Parameters**:
- `currentBalance`: Current account balance (starting point)
- `historicalTransactions`: Historical completed transactions (for spending calculation)
- `plannedTransactions`: Future planned transactions
- `startDate`: Start date for forecast (YYYY-MM-DD format)
- `endDate`: End date for forecast (YYYY-MM-DD format)
- `userSettings`: User-defined settings
  - `minimumSafeBalance`: User's minimum safe balance threshold
  - `safetyBufferDays`: Number of days of spending to keep as buffer (default: 7)

**Returns**:
```typescript
{
  forecasts: DailyForecast[]        // Array of daily projections
  averageDailySpending: number      // Conservative daily spending estimate
  spendingConfidence: 'high' | 'medium' | 'low' | 'none'
  shouldDisplay: boolean            // False if confidence is too low
}
```

**Daily Forecast Structure**:
```typescript
{
  date: string                      // YYYY-MM-DD
  projectedBalance: number          // Projected balance at end of day
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
```

**Risk Levels**:
- `danger`: Balance < minimum safe balance
- `warning`: Balance < minimum safe balance + (daily spending × safety buffer days)
- `safe`: Balance >= warning threshold

**Confidence Calculation**:
- Inherits from spending confidence
- Decreases with distance into future:
  - `high`: < 14 days ahead with high spending confidence
  - `medium`: 14-30 days ahead or medium spending confidence
  - `low`: > 30 days ahead or low/none spending confidence

**Example**:
```typescript
const result = calculateDailyForecast(
  5000,                              // Current balance
  historicalTransactions,
  plannedTransactions,
  '2026-02-01',
  '2026-02-28',
  {
    minimumSafeBalance: 1000,
    safetyBufferDays: 7
  }
)

if (result.shouldDisplay) {
  result.forecasts.forEach(forecast => {
    console.log(`${forecast.date}: ₴${forecast.projectedBalance.toFixed(2)} (${forecast.riskLevel})`)
  })
}
```

---

### 3. Payment Risk Assessment

**Location**: `src/lib/calculations/payment-risk-assessment.ts`

Assesses risk for upcoming planned transactions.

#### Function: `assessPaymentRisks`

```typescript
function assessPaymentRisks(
  plannedTransactions: Transaction[],
  dailyForecasts: DailyForecast[],
  averageDailySpending: number,
  safetyBufferDays?: number
): PaymentRisk[]
```

**Purpose**: Identify high-risk upcoming payments and provide actionable recommendations.

**Algorithm**:
1. Filter to expense transactions only
2. For each planned expense:
   - Find forecast for payment date
   - Calculate balance after payment
   - Compare to safety buffer (daily spending × buffer days)
   - Determine risk level
   - Generate recommendation
3. Sort by urgency (soonest first)

**Parameters**:
- `plannedTransactions`: List of planned transactions to assess
- `dailyForecasts`: Daily balance forecasts from `calculateDailyForecast`
- `averageDailySpending`: Average daily spending amount
- `safetyBufferDays`: Number of days of spending to keep as buffer (default: 7)

**Returns**:
```typescript
PaymentRisk[] = [
  {
    transaction: Transaction          // The planned transaction
    daysUntil: number                // Days until payment
    projectedBalanceAtDate: number   // Balance before payment
    balanceAfterPayment: number      // Balance after payment
    riskLevel: 'safe' | 'warning' | 'danger'
    recommendation: string           // User-facing recommendation
    canAfford: boolean               // Whether payment can be made
  }
]
```

**Risk Determination**:
- `danger`: Balance after payment < 0 (insufficient funds)
- `warning`: Balance after payment < safety buffer
- `safe`: Balance after payment >= safety buffer

**Example**:
```typescript
const risks = assessPaymentRisks(
  plannedTransactions,
  dailyForecasts,
  result.averageDailySpending,
  7  // 7-day safety buffer
)

risks.forEach(risk => {
  console.log(`${risk.transaction.description} (${risk.daysUntil} days)`)
  console.log(`Risk: ${risk.riskLevel}`)
  console.log(`Recommendation: ${risk.recommendation}`)
})
```

---

### 4. Forecast Service

**Location**: `src/lib/services/forecast-service.ts`

Service layer for fetching data and calculating forecasts with caching.

#### Class: `ForecastService`

**Purpose**: Centralized data fetching with 5-minute caching to reduce database load.

#### Method: `getForecast`

```typescript
async getForecast(
  workspaceId: string,
  accountId: string,
  options: ForecastOptions
): Promise<CompleteForecast>
```

**Purpose**: Get complete forecast including daily projections and payment risks.

**Process**:
1. Check cache (5-minute TTL)
2. If cache miss:
   - Fetch historical transactions (last 90 days)
   - Fetch planned transactions (for forecast period)
   - Fetch user settings (minimum safe balance, safety buffer)
   - Fetch current account balance
3. Calculate daily forecast
4. Calculate payment risks
5. Cache result
6. Return complete forecast

**Parameters**:
- `workspaceId`: Workspace ID
- `accountId`: Account ID
- `options`: Forecast options
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)
  - `minimumSafeBalance`: Optional override for user setting
  - `safetyBufferDays`: Optional override for user setting

**Returns**:
```typescript
{
  forecast: ForecastResult          // Daily forecasts
  paymentRisks: PaymentRisk[]       // Payment risk assessments
  currentBalance: number            // Current account balance
  userSettings: {
    minimumSafeBalance: number
    safetyBufferDays: number
  }
}
```

**Caching**:
- Cache key: `${workspaceId}:${accountId}`
- TTL: 5 minutes
- Invalidation: Call `invalidateCache()` when transactions change

**Example**:
```typescript
const service = new ForecastService()

// Get forecast
const forecast = await service.getForecast(
  'workspace-id',
  'account-id',
  {
    startDate: '2026-02-01',
    endDate: '2026-02-28'
  }
)

// Invalidate cache after transaction change
service.invalidateCache('workspace-id', 'account-id')
```

---

## Server Actions

### getForecast

**Location**: `src/actions/forecast.ts`

```typescript
async function getForecast(
  workspaceId: string,
  accountId: string | null,
  month: Date
): Promise<{ data?: ForecastResult; error?: string }>
```

**Purpose**: Server action for fetching forecast data from client components.

**Process**:
1. Verify user authentication
2. Verify workspace membership
3. Call `forecastService.getForecast()`
4. Return result or error

**Example**:
```typescript
'use client'

import { getForecast } from '@/actions/forecast'

export function ForecastWidget() {
  const [forecast, setForecast] = useState(null)
  
  useEffect(() => {
    async function loadForecast() {
      const result = await getForecast(
        workspaceId,
        accountId,
        new Date()
      )
      
      if (result.data) {
        setForecast(result.data)
      }
    }
    
    loadForecast()
  }, [workspaceId, accountId])
  
  // Render forecast...
}
```

---

## Database Schema

### Transactions Table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  account_id UUID NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type VARCHAR(20) NOT NULL,  -- 'income' | 'expense'
  transaction_date DATE NOT NULL,
  is_expected BOOLEAN DEFAULT FALSE,  -- true for planned transactions
  deleted_at TIMESTAMP,
  -- ... other fields
)
```

**Key Fields**:
- `is_expected`: `false` for completed transactions, `true` for planned transactions
- `transaction_date`: Date of transaction (or planned date for future transactions)

### User Settings Table

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  minimum_safe_balance DECIMAL(15, 2) DEFAULT 1000,
  safety_buffer_days INTEGER DEFAULT 7,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
)
```

**Key Fields**:
- `minimum_safe_balance`: User-defined minimum safe balance threshold
- `safety_buffer_days`: Number of days of spending to keep as buffer

---

## Error Handling

### Insufficient Data

When there's insufficient historical data (< 14 days):

```typescript
{
  forecasts: [],
  averageDailySpending: 0,
  spendingConfidence: 'none',
  shouldDisplay: false  // Don't show forecast to user
}
```

**UI Behavior**: Show message encouraging user to add more transactions.

### Missing Forecast Data

When payment risk assessment can't find forecast for a date:

```typescript
{
  riskLevel: 'danger',
  recommendation: 'Unable to calculate - insufficient forecast data',
  canAfford: false
}
```

### Service Errors

All service methods throw errors with descriptive messages:

```typescript
try {
  const forecast = await forecastService.getForecast(...)
} catch (error) {
  console.error('Forecast calculation failed:', error.message)
  // Show error to user
}
```

---

## Performance Considerations

### Caching Strategy

- **Cache TTL**: 5 minutes
- **Cache Key**: `${workspaceId}:${accountId}`
- **Invalidation**: Automatic on transaction changes

### Query Optimization

- Historical transactions: Limited to last 90 days
- Planned transactions: Limited to forecast period
- Indexes on `workspace_id`, `account_id`, `is_expected`, `transaction_date`

### Calculation Complexity

- Average daily spending: O(n) where n = number of transactions
- Daily forecast: O(d) where d = number of days in forecast period
- Payment risk: O(p) where p = number of planned transactions

**Typical Performance**:
- 90 days of history (100 transactions): ~10ms
- 30-day forecast: ~5ms
- 10 planned transactions: ~2ms
- **Total**: ~20ms (excluding database queries)

---

## Testing

### Unit Tests

**Average Daily Spending**:
```typescript
describe('calculateAverageDailySpending', () => {
  it('should calculate average correctly', () => {
    const result = calculateAverageDailySpending(transactions)
    expect(result.averageDailySpending).toBeCloseTo(150, 2)
  })
  
  it('should exclude outliers', () => {
    const result = calculateAverageDailySpending(transactions)
    expect(result.transactionsExcluded).toBeGreaterThan(0)
  })
  
  it('should return none confidence for insufficient data', () => {
    const result = calculateAverageDailySpending(fewTransactions)
    expect(result.confidence).toBe('none')
  })
})
```

**Daily Forecast**:
```typescript
describe('calculateDailyForecast', () => {
  it('should project balances correctly', () => {
    const result = calculateDailyForecast(...)
    expect(result.forecasts).toHaveLength(28) // 28 days
    expect(result.forecasts[0].projectedBalance).toBeGreaterThan(0)
  })
  
  it('should identify risk days', () => {
    const result = calculateDailyForecast(...)
    const dangerDays = result.forecasts.filter(f => f.riskLevel === 'danger')
    expect(dangerDays.length).toBeGreaterThan(0)
  })
})
```

### Integration Tests

See `tests/integration/calculations/` for complete integration test suite.

---

## Security

### Access Control

All forecast operations verify:
1. User is authenticated
2. User is member of workspace
3. User has access to account

### Data Isolation

- Row Level Security (RLS) on all tables
- Workspace-based data isolation
- No cross-workspace data leakage

### Input Validation

- Date ranges validated
- Balance values validated (non-negative)
- User settings validated (reasonable ranges)

---

## Future Enhancements

### Planned Features

1. **Weekday/Weekend Patterns**: Different spending patterns for weekdays vs weekends
2. **Category-Based Forecasting**: Separate forecasts per spending category
3. **Scenario Analysis**: "What-if" scenarios for different spending levels
4. **Confidence Intervals**: Show range of possible outcomes
5. **Machine Learning**: Learn from user's actual vs projected spending

### API Extensions

1. **Batch Forecasting**: Calculate forecasts for multiple accounts at once
2. **Historical Accuracy**: Track forecast accuracy over time
3. **Alerts**: Proactive notifications for high-risk situations
4. **Export**: Export forecast data for external analysis

---

## Troubleshooting

### Forecast Not Displaying

**Symptom**: `shouldDisplay: false` in forecast result

**Causes**:
1. Insufficient historical data (< 14 days)
2. Low confidence in spending calculation
3. No transactions in account

**Solution**: Add more historical transactions (minimum 14 days of data)

### Inaccurate Projections

**Symptom**: Forecast doesn't match actual spending

**Causes**:
1. Recent spending pattern change
2. Large one-time purchases not excluded
3. Planned transactions not entered

**Solution**:
1. Wait for more recent data to accumulate
2. Adjust outlier threshold
3. Enter all known planned transactions

### Cache Issues

**Symptom**: Forecast not updating after transaction changes

**Cause**: Cache not invalidated

**Solution**: Call `forecastService.invalidateCache()` after transaction changes

---

## Support

For questions or issues:
1. Check this documentation
2. Review test files for examples
3. Check steering files in `.kiro/steering/`
4. Review spec files in `.kiro/specs/user-journey-enhancement/`
