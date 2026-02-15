# User Journey & Financial Safety Enhancement - Design Document

## User-Defined Parameters (Confirmed)

Based on user requirements, the following parameters are set:

1. **Forecast Complexity**: Simple daily average (no weekday/weekend patterns) ✅
2. **Risk Thresholds**: User-defined minimum safe balance (stored in user_settings table) ✅
3. **Historical Data**: Minimum 14 days of transactions required ✅
4. **Confidence Display**: Hide uncertain forecasts (don't show if confidence is low) ✅
5. **Planning Horizon**: Maximum 6 months ahead (not 1 year) ✅

---

## 1. Overview

### 1.1 Design Philosophy

**CRITICAL SAFETY PRINCIPLES:**
1. **Conservative Estimates** - Always err on the side of caution
2. **Transparent Calculations** - Users must understand what they're seeing
3. **Data Integrity** - Planned transactions NEVER affect actual balances
4. **Clear Warnings** - Risk indicators must be obvious and actionable
5. **Graceful Degradation** - Show partial data rather than fail completely

**USER-DEFINED PARAMETERS:**
- **Risk Threshold**: User can set their own minimum safe balance (default: ₴0)
- **Forecast Complexity**: Simple daily average (no weekday/weekend patterns)
- **Historical Data Requirement**: Minimum 14 days of transactions
- **Planning Horizon**: Maximum 6 months ahead
- **Confidence Display**: Hide uncertain forecasts (don't show if confidence is low)

### 1.2 Risk Mitigation Strategy

This feature deals with users' real money and financial decisions. We must:
- Validate all calculations with unit tests
- Use conservative assumptions (overestimate expenses, underestimate income)
- Show confidence levels clearly
- Provide tooltips explaining calculations
- Allow users to verify forecast logic
- Never hide uncertainty

### 1.3 Architecture Principles

- **Separation of Concerns**: Forecast calculations separate from UI
- **Immutability**: Planned transactions don't modify actual data
- **Caching**: Expensive calculations cached with short TTL
- **Testability**: All calculation logic pure functions
- **Observability**: Log forecast calculations for debugging

---

## 2. Database Schema Changes

### 2.1 Transaction Status Field

**CRITICAL: This field determines if transaction affects actual balance**

```sql
-- Add status column to transactions table
ALTER TABLE transactions 
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'completed'
CHECK (status IN ('completed', 'planned'));

-- Add index for filtering
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_status_date ON transactions(status, transaction_date);

-- Add planned_date for future reference (max 6 months ahead)
ALTER TABLE transactions
ADD COLUMN planned_date DATE
CHECK (planned_date IS NULL OR planned_date <= CURRENT_DATE + INTERVAL '6 months');

-- Add completed_at for tracking when planned became completed
ALTER TABLE transactions
ADD COLUMN completed_at TIMESTAMP;
```

**Migration Strategy:**
```sql
-- All existing transactions are 'completed'
UPDATE transactions SET status = 'completed' WHERE status IS NULL;

-- Backfill completed_at with created_at for existing transactions
UPDATE transactions 
SET completed_at = created_at 
WHERE status = 'completed' AND completed_at IS NULL;
```

### 2.2 Data Integrity Rules

**CRITICAL CONSTRAINTS:**

1. **Completed transactions:**
   - Must have `completed_at` timestamp
   - Must have `transaction_date` <= today
   - Affect account balances immediately

2. **Planned transactions:**
   - Must have `planned_date` >= today
   - Must NOT have `completed_at`
   - Do NOT affect account balances
   - Can be converted to completed

3. **Conversion rules:**
   ```sql
   -- When marking planned as completed
   UPDATE transactions
   SET 
     status = 'completed',
     completed_at = NOW(),
     transaction_date = COALESCE(planned_date, transaction_date)
   WHERE id = ? AND status = 'planned';
   ```

### 2.4 User Settings Table (NEW)

**Purpose:** Store user-specific forecast preferences

```sql
-- Create user_settings table for forecast preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Forecast preferences
  minimum_safe_balance DECIMAL(15, 2) DEFAULT 0.00,
  safety_buffer_days INTEGER DEFAULT 7 CHECK (safety_buffer_days >= 1 AND safety_buffer_days <= 30),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, workspace_id)
);

-- RLS policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for lookups
CREATE INDEX idx_user_settings_user_workspace 
ON user_settings(user_id, workspace_id);
```

**CRITICAL: Separate views for actual vs projected balances**

```sql
-- View for ACTUAL balances (completed transactions only)
CREATE OR REPLACE VIEW account_actual_balances AS
SELECT 
  a.id as account_id,
  a.name,
  a.initial_balance,
  COALESCE(SUM(
    CASE 
      WHEN t.type = 'income' THEN t.amount
      WHEN t.type = 'expense' THEN -t.amount
      WHEN t.type = 'transfer_in' THEN t.amount
      WHEN t.type = 'transfer_out' THEN -t.amount
      ELSE 0
    END
  ), 0) as transaction_sum,
  a.initial_balance + COALESCE(SUM(
    CASE 
      WHEN t.type = 'income' THEN t.amount
      WHEN t.type = 'expense' THEN -t.amount
      WHEN t.type = 'transfer_in' THEN t.amount
      WHEN t.type = 'transfer_out' THEN -t.amount
      ELSE 0
    END
  ), 0) as current_balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id 
  AND t.status = 'completed'  -- CRITICAL: Only completed
  AND t.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.initial_balance;
```

---

## 3. Core Calculation Engine

### 3.1 Average Daily Spending Calculator

**Purpose:** Calculate realistic daily spending estimate
**Risk:** Overestimating is safer than underestimating

```typescript
// src/lib/forecast/average-daily-spending.ts

interface SpendingCalculationOptions {
  lookbackDays: number          // Default: 30
  excludeOneTimeLarge: boolean  // Default: true
  excludeCategories?: string[]  // e.g., ['one-time-purchase']
  minimumTransactions: number   // Default: 14 (based on 14-day minimum)
  minimumDaysWithData: number   // Default: 14 (require 14 days minimum)
}

interface SpendingResult {
  averageDailySpending: number
  confidence: 'high' | 'medium' | 'low'
  dataQuality: {
    transactionCount: number
    daysWithData: number
    largeTransactionsExcluded: number
  }
}

/**
 * Calculate average daily spending with safety measures
 * 
 * SAFETY RULES:
 * 1. Exclude one-time large purchases (> 2x median)
 * 2. Require minimum transaction count
 * 3. Return conservative estimate if insufficient data
 * 4. Include confidence level
 */
export function calculateAverageDailySpending(
  transactions: Transaction[],
  options: SpendingCalculationOptions = {
    lookbackDays: 30,
    excludeOneTimeLarge: true,
    minimumTransactions: 14,
    minimumDaysWithData: 14
  }
): SpendingResult {
  // Filter to expenses only, within lookback period
  const expenses = transactions.filter(t => 
    t.type === 'expense' &&
    t.status === 'completed' &&
    isWithinInterval(t.transaction_date, {
      start: subDays(new Date(), options.lookbackDays),
      end: new Date()
    })
  )
  
  // Check minimum data requirement (14 days minimum)
  const daysWithData = new Set(
    expenses.map(t => format(t.transaction_date, 'yyyy-MM-dd'))
  ).size
  
  if (expenses.length < options.minimumTransactions || 
      daysWithData < options.minimumDaysWithData) {
    return {
      averageDailySpending: 0,
      confidence: 'low',
      dataQuality: {
        transactionCount: expenses.length,
        daysWithData,
        largeTransactionsExcluded: 0
      }
    }
  }
  
  // Exclude one-time large purchases
  let filteredExpenses = expenses
  let largeTransactionsExcluded = 0
  
  if (options.excludeOneTimeLarge) {
    const amounts = expenses.map(t => t.amount).sort((a, b) => a - b)
    const median = amounts[Math.floor(amounts.length / 2)]
    const threshold = median * 2
    
    filteredExpenses = expenses.filter(t => {
      if (t.amount > threshold) {
        largeTransactionsExcluded++
        return false
      }
      return true
    })
  }
  
  // Calculate average
  const totalExpenses = filteredExpenses.reduce((sum, t) => sum + t.amount, 0)
  const averageDailySpending = totalExpenses / options.lookbackDays
  
  // Determine confidence
  const daysWithData = new Set(
    filteredExpenses.map(t => format(t.transaction_date, 'yyyy-MM-dd'))
  ).size
  
  const confidence = 
    daysWithData >= 20 && filteredExpenses.length >= 30 ? 'high' :
    daysWithData >= 10 && filteredExpenses.length >= 15 ? 'medium' :
    'low'
  
  return {
    averageDailySpending,
    confidence,
    dataQuality: {
      transactionCount: filteredExpenses.length,
      daysWithData,
      largeTransactionsExcluded
    }
  }
}
```


### 3.2 Daily Cash Flow Forecast Engine

**Purpose:** Project future balances with safety margins
**Risk:** Must be conservative and transparent

```typescript
// src/lib/forecast/daily-forecast.ts

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
  warnings: string[]  // User-facing warnings
}

interface ForecastOptions {
  startDate: Date
  endDate: Date
  currentBalance: number
  safetyBufferDays: number  // Default: 7 (one week buffer)
  conservativeMultiplier: number  // Default: 1.1 (10% safety margin)
}

/**
 * Calculate daily cash flow forecast
 * 
 * SAFETY RULES:
 * 1. Use conservative spending estimates (10% higher)
 * 2. Include safety buffer for risk calculation
 * 3. Show warnings for low confidence
 * 4. Never hide uncertainty
 * 5. Validate all inputs
 */
export async function calculateDailyForecast(
  accountId: string,
  completedTransactions: Transaction[],
  plannedTransactions: Transaction[],
  options: ForecastOptions
): Promise<DailyForecast[]> {
  // Validate inputs
  if (options.currentBalance < 0) {
    throw new Error('Current balance cannot be negative')
  }
  
  if (options.startDate > options.endDate) {
    throw new Error('Start date must be before end date')
  }
  
  // Calculate average daily spending
  const spendingResult = calculateAverageDailySpending(
    completedTransactions,
    { lookbackDays: 30, excludeOneTimeLarge: true, minimumTransactions: 10 }
  )
  
  // Apply conservative multiplier (10% safety margin)
  const conservativeDaily = 
    spendingResult.averageDailySpending * options.conservativeMultiplier
  
  // Generate forecast for each day
  const forecasts: DailyForecast[] = []
  let runningBalance = options.currentBalance
  
  for (
    let date = options.startDate; 
    date <= options.endDate; 
    date = addDays(date, 1)
  ) {
    const warnings: string[] = []
    
    // Get planned transactions for this day
    const dayPlanned = plannedTransactions.filter(t =>
      isSameDay(t.planned_date || t.transaction_date, date)
    )
    
    const plannedIncome = dayPlanned
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const plannedExpenses = dayPlanned
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    // Calculate projected balance
    const startingBalance = runningBalance
    const endingBalance = 
      startingBalance +
      plannedIncome -
      plannedExpenses -
      conservativeDaily
    
    // Determine risk level
    const safetyBuffer = conservativeDaily * options.safetyBufferDays
    const riskLevel = 
      endingBalance < 0 ? 'danger' :
      endingBalance < safetyBuffer ? 'warning' :
      'safe'
    
    // Add warnings
    if (spendingResult.confidence === 'low') {
      warnings.push('Limited historical data - forecast may be inaccurate')
    }
    
    if (riskLevel === 'danger') {
      warnings.push(`Projected balance below zero by ${formatCurrency(Math.abs(endingBalance))}`)
    }
    
    if (riskLevel === 'warning') {
      warnings.push(`Balance below ${options.safetyBufferDays}-day safety buffer`)
    }
    
    // Determine confidence (decreases with distance)
    const daysInFuture = differenceInDays(date, new Date())
    const confidence = 
      spendingResult.confidence === 'low' ? 'low' :
      daysInFuture > 30 ? 'low' :
      daysInFuture > 14 ? 'medium' :
      'high'
    
    forecasts.push({
      date,
      projectedBalance: endingBalance,
      confidence,
      riskLevel,
      breakdown: {
        startingBalance,
        plannedIncome,
        plannedExpenses,
        estimatedDailySpending: conservativeDaily,
        endingBalance
      },
      warnings
    })
    
    runningBalance = endingBalance
  }
  
  return forecasts
}
```

### 3.3 Payment Risk Assessment

**Purpose:** Identify high-risk upcoming payments
**Risk:** False negatives (missing risks) are worse than false positives

```typescript
// src/lib/forecast/payment-risk.ts

interface PaymentRisk {
  transaction: Transaction
  daysUntil: number
  projectedBalanceAtDate: number
  balanceAfterPayment: number
  riskLevel: 'safe' | 'warning' | 'danger'
  recommendation: string
  canAfford: boolean
}

/**
 * Assess risk for each upcoming payment
 * 
 * SAFETY RULES:
 * 1. Conservative balance projections
 * 2. Clear recommendations
 * 3. Account for daily spending after payment
 * 4. Flag payments that leave insufficient buffer
 */
export function assessPaymentRisks(
  plannedTransactions: Transaction[],
  dailyForecasts: DailyForecast[],
  averageDailySpending: number,
  safetyBufferDays: number = 7
): PaymentRisk[] {
  return plannedTransactions
    .filter(t => t.type === 'expense')
    .map(transaction => {
      const paymentDate = transaction.planned_date || transaction.transaction_date
      const daysUntil = differenceInDays(paymentDate, new Date())
      
      // Find forecast for payment date
      const forecast = dailyForecasts.find(f => 
        isSameDay(f.date, paymentDate)
      )
      
      if (!forecast) {
        return {
          transaction,
          daysUntil,
          projectedBalanceAtDate: 0,
          balanceAfterPayment: -transaction.amount,
          riskLevel: 'danger' as const,
          recommendation: 'Unable to calculate - insufficient forecast data',
          canAfford: false
        }
      }
      
      const projectedBalance = forecast.breakdown.startingBalance
      const balanceAfterPayment = projectedBalance - transaction.amount
      const safetyBuffer = averageDailySpending * safetyBufferDays
      
      // Determine risk and recommendation
      let riskLevel: 'safe' | 'warning' | 'danger'
      let recommendation: string
      let canAfford: boolean
      
      if (balanceAfterPayment < 0) {
        riskLevel = 'danger'
        recommendation = `Insufficient funds. Need ${formatCurrency(Math.abs(balanceAfterPayment))} more by ${format(paymentDate, 'MMM d')}.`
        canAfford = false
      } else if (balanceAfterPayment < safetyBuffer) {
        riskLevel = 'warning'
        recommendation = `Balance will be tight. Only ${formatCurrency(balanceAfterPayment)} remaining after payment (less than ${safetyBufferDays}-day buffer).`
        canAfford = true
      } else {
        riskLevel = 'safe'
        recommendation = `Sufficient funds available. ${formatCurrency(balanceAfterPayment)} remaining after payment.`
        canAfford = true
      }
      
      return {
        transaction,
        daysUntil,
        projectedBalanceAtDate: projectedBalance,
        balanceAfterPayment,
        riskLevel,
        recommendation,
        canAfford
      }
    })
    .sort((a, b) => a.daysUntil - b.daysUntil) // Soonest first
}
```

---

## 4. Data Access Layer

### 4.1 Forecast Data Service

**Purpose:** Centralized data fetching with caching
**Risk:** Stale data could show incorrect forecasts

```typescript
// src/lib/services/forecast-service.ts

interface ForecastData {
  currentBalance: number
  completedTransactions: Transaction[]
  plannedTransactions: Transaction[]
  accounts: Account[]
  lastUpdated: Date
}

/**
 * Fetch all data needed for forecast calculations
 * 
 * SAFETY RULES:
 * 1. Always fetch fresh balance data
 * 2. Cache with short TTL (5 minutes)
 * 3. Validate data integrity
 * 4. Handle missing data gracefully
 */
export class ForecastService {
  private cache: Map<string, { data: ForecastData; expiresAt: Date }> = new Map()
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
  
  async getForecastData(
    workspaceId: string,
    accountId?: string
  ): Promise<ForecastData> {
    const cacheKey = `${workspaceId}-${accountId || 'all'}`
    
    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > new Date()) {
      return cached.data
    }
    
    // Fetch fresh data
    const supabase = await createClient()
    
    // Get accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
    
    if (accountsError) throw accountsError
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found')
    }
    
    // Filter to specific account if provided
    const targetAccounts = accountId 
      ? accounts.filter(a => a.id === accountId)
      : accounts
    
    // Calculate current balance (completed transactions only)
    const { data: balanceData } = await supabase
      .from('account_actual_balances')
      .select('current_balance')
      .in('account_id', targetAccounts.map(a => a.id))
    
    const currentBalance = balanceData?.reduce(
      (sum, b) => sum + (b.current_balance || 0), 
      0
    ) || 0
    
    // Get completed transactions (last 90 days for history)
    const { data: completed, error: completedError } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', targetAccounts.map(a => a.id))
      .eq('status', 'completed')
      .gte('transaction_date', format(subDays(new Date(), 90), 'yyyy-MM-dd'))
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
    
    if (completedError) throw completedError
    
    // Get planned transactions (future only)
    const { data: planned, error: plannedError } = await supabase
      .from('transactions')
      .select('*')
      .in('account_id', targetAccounts.map(a => a.id))
      .eq('status', 'planned')
      .gte('planned_date', format(new Date(), 'yyyy-MM-dd'))
      .is('deleted_at', null)
      .order('planned_date', { ascending: true })
    
    if (plannedError) throw plannedError
    
    const data: ForecastData = {
      currentBalance,
      completedTransactions: completed || [],
      plannedTransactions: planned || [],
      accounts: targetAccounts,
      lastUpdated: new Date()
    }
    
    // Cache with TTL
    this.cache.set(cacheKey, {
      data,
      expiresAt: addMilliseconds(new Date(), this.CACHE_TTL_MS)
    })
    
    return data
  }
  
  /**
   * Invalidate cache when transactions change
   */
  invalidateCache(workspaceId: string, accountId?: string): void {
    const cacheKey = `${workspaceId}-${accountId || 'all'}`
    this.cache.delete(cacheKey)
  }
}

export const forecastService = new ForecastService()
```



---

## 5. Server Actions

### 5.1 Get Forecast Action

```typescript
// src/actions/forecast.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { forecastService } from '@/lib/services/forecast-service'
import { calculateDailyForecast } from '@/lib/forecast/daily-forecast'
import { assessPaymentRisks } from '@/lib/forecast/payment-risk'
import { calculateAverageDailySpending } from '@/lib/forecast/average-daily-spending'

export interface ForecastResult {
  dailyForecasts: DailyForecast[]
  paymentRisks: PaymentRisk[]
  averageDailySpending: number
  spendingConfidence: 'high' | 'medium' | 'low'
  metadata: {
    calculatedAt: Date
    dataQuality: {
      transactionCount: number
      daysWithData: number
    }
  }
}

export async function getForecast(
  workspaceId: string,
  accountId: string | null,
  month: Date
): Promise<{ data?: ForecastResult; error?: string }> {
  try {
    // Verify user has access to workspace
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }
    
    // Verify workspace membership
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()
    
    if (!member) {
      return { error: 'Access denied' }
    }
    
    // Get forecast data
    const forecastData = await forecastService.getForecastData(
      workspaceId,
      accountId || undefined
    )
    
    // Calculate average daily spending
    const spendingResult = calculateAverageDailySpending(
      forecastData.completedTransactions,
      {
        lookbackDays: 30,
        excludeOneTimeLarge: true,
        minimumTransactions: 10
      }
    )
    
    // Calculate daily forecast for selected month
    const startDate = startOfMonth(month)
    const endDate = endOfMonth(month)
    
    const dailyForecasts = await calculateDailyForecast(
      accountId || 'all',
      forecastData.completedTransactions,
      forecastData.plannedTransactions,
      {
        startDate,
        endDate,
        currentBalance: forecastData.currentBalance,
        safetyBufferDays: 7,
        conservativeMultiplier: 1.1
      }
    )
    
    // Assess payment risks
    const paymentRisks = assessPaymentRisks(
      forecastData.plannedTransactions,
      dailyForecasts,
      spendingResult.averageDailySpending,
      7 // 7-day safety buffer
    )
    
    return {
      data: {
        dailyForecasts,
        paymentRisks,
        averageDailySpending: spendingResult.averageDailySpending,
        spendingConfidence: spendingResult.confidence,
        metadata: {
          calculatedAt: new Date(),
          dataQuality: spendingResult.dataQuality
        }
      }
    }
  } catch (error) {
    console.error('Forecast calculation error:', error)
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Failed to calculate forecast' 
    }
  }
}
```

### 5.2 Convert Planned to Completed Action

```typescript
// src/actions/transactions.ts

/**
 * Convert planned transaction to completed
 * 
 * CRITICAL: This affects actual balance
 */
export async function markPlannedAsCompleted(
  transactionId: string
): Promise<{ data?: Transaction; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }
    
    // Get transaction and verify it's planned
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*, account:accounts(workspace_id)')
      .eq('id', transactionId)
      .eq('status', 'planned')
      .single()
    
    if (fetchError || !transaction) {
      return { error: 'Transaction not found or already completed' }
    }
    
    // Verify user has access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', transaction.account.workspace_id)
      .eq('user_id', user.id)
      .single()
    
    if (!member) {
      return { error: 'Access denied' }
    }
    
    // Update transaction to completed
    const { data: updated, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        transaction_date: transaction.planned_date || transaction.transaction_date
      })
      .eq('id', transactionId)
      .select()
      .single()
    
    if (updateError) {
      return { error: 'Failed to update transaction' }
    }
    
    // Invalidate forecast cache
    forecastService.invalidateCache(
      transaction.account.workspace_id,
      transaction.account_id
    )
    
    return { data: updated }
  } catch (error) {
    console.error('Error marking transaction as completed:', error)
    return { error: 'An unexpected error occurred' }
  }
}
```

---

## 6. UI Components

### 6.1 Daily Forecast Chart Component

```typescript
// src/components/forecast/daily-forecast-chart.tsx
'use client'

import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { format } from 'date-fns'
import type { DailyForecast } from '@/lib/forecast/daily-forecast'

interface DailyForecastChartProps {
  forecasts: DailyForecast[]
  currency: string
}

export function DailyForecastChart({ 
  forecasts, 
  currency 
}: DailyForecastChartProps) {
  const chartData = useMemo(() => {
    return {
      labels: forecasts.map(f => format(f.date, 'MMM d')),
      datasets: [
        {
          label: 'Projected Balance',
          data: forecasts.map(f => f.projectedBalance),
          borderColor: (context: any) => {
            const index = context.dataIndex
            const forecast = forecasts[index]
            return forecast.riskLevel === 'danger' ? '#EF4444' :
                   forecast.riskLevel === 'warning' ? '#F59E0B' :
                   '#4E7A58'
          },
          backgroundColor: 'transparent',
          pointBackgroundColor: (context: any) => {
            const index = context.dataIndex
            const forecast = forecasts[index]
            return forecast.riskLevel === 'danger' ? '#EF4444' :
                   forecast.riskLevel === 'warning' ? '#F59E0B' :
                   '#4E7A58'
          },
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4
        }
      ]
    }
  }, [forecasts])
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const forecast = forecasts[context.dataIndex]
            return [
              `Balance: ${formatCurrency(forecast.projectedBalance, currency)}`,
              `Confidence: ${forecast.confidence}`,
              ...forecast.warnings
            ]
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: number) => formatCurrency(value, currency)
        }
      }
    }
  }
  
  // Calculate summary stats
  const safeDays = forecasts.filter(f => f.riskLevel === 'safe').length
  const warningDays = forecasts.filter(f => f.riskLevel === 'warning').length
  const dangerDays = forecasts.filter(f => f.riskLevel === 'danger').length
  
  return (
    <div className="space-y-4">
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
      
      <div className="flex gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#4E7A58]" />
          <span className="text-secondary">Safe: {safeDays} days</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
          <span className="text-secondary">Warning: {warningDays} days</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
          <span className="text-secondary">Risk: {dangerDays} days</span>
        </div>
      </div>
      
      {/* Low confidence warning */}
      {forecasts.some(f => f.confidence === 'low') && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Limited historical data - forecast accuracy may be reduced
          </p>
        </div>
      )}
    </div>
  )
}
```

### 6.2 Upcoming Payments Widget

```typescript
// src/components/forecast/upcoming-payments-widget.tsx
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { markPlannedAsCompleted } from '@/actions/transactions'
import type { PaymentRisk } from '@/lib/forecast/payment-risk'

interface UpcomingPaymentsWidgetProps {
  paymentRisks: PaymentRisk[]
  currency: string
  onPaymentMarked?: () => void
}

export function UpcomingPaymentsWidget({
  paymentRisks,
  currency,
  onPaymentMarked
}: UpcomingPaymentsWidgetProps) {
  const [markingId, setMarkingId] = useState<string | null>(null)
  
  const handleMarkAsPaid = async (transactionId: string) => {
    setMarkingId(transactionId)
    
    const result = await markPlannedAsCompleted(transactionId)
    
    if (result.error) {
      alert(result.error) // TODO: Use toast notification
    } else {
      onPaymentMarked?.()
    }
    
    setMarkingId(null)
  }
  
  // Calculate totals
  const next7Days = paymentRisks
    .filter(r => r.daysUntil <= 7)
    .reduce((sum, r) => sum + r.transaction.amount, 0)
  
  const next30Days = paymentRisks
    .reduce((sum, r) => sum + r.transaction.amount, 0)
  
  const highRiskCount = paymentRisks.filter(r => r.riskLevel === 'danger').length
  
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">
            Upcoming Payments
          </h3>
          {highRiskCount > 0 && (
            <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs font-medium rounded">
              {highRiskCount} at risk
            </span>
          )}
        </div>
        
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-glass rounded-lg">
          <div>
            <p className="text-xs text-secondary">Next 7 Days</p>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(next7Days, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-secondary">Next 30 Days</p>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(next30Days, currency)}
            </p>
          </div>
        </div>
        
        {/* Payment list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {paymentRisks.length === 0 ? (
            <p className="text-sm text-secondary text-center py-4">
              No upcoming payments scheduled
            </p>
          ) : (
            paymentRisks.slice(0, 10).map(risk => (
              <div
                key={risk.transaction.id}
                className="p-3 bg-glass rounded-lg border border-primary/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {risk.riskLevel === 'danger' && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      {risk.riskLevel === 'warning' && (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                      {risk.riskLevel === 'safe' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      <span className="font-medium text-primary">
                        {risk.transaction.description}
                      </span>
                    </div>
                    
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <span className="text-primary font-semibold">
                        {formatCurrency(risk.transaction.amount, currency)}
                      </span>
                      <span className="text-secondary">
                        in {risk.daysUntil} {risk.daysUntil === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                    
                    <p className="mt-1 text-xs text-secondary">
                      {risk.recommendation}
                    </p>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleMarkAsPaid(risk.transaction.id)}
                    disabled={markingId === risk.transaction.id}
                  >
                    {markingId === risk.transaction.id ? 'Marking...' : 'Mark Paid'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  )
}
```



---

## 7. Transaction Form Updates

### 7.1 Enhanced Transaction Form with Planned Status

```typescript
// src/components/transactions/transaction-form.tsx

interface TransactionFormData {
  amount: number
  description: string
  category_id: string
  account_id: string
  type: 'income' | 'expense' | 'transfer'
  status: 'completed' | 'planned'  // NEW
  transaction_date: Date
  planned_date?: Date  // NEW - for future transactions
}

export function TransactionForm({ 
  defaultValues,
  onSubmit 
}: TransactionFormProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    ...defaultValues,
    status: 'completed'
  })
  
  // Determine if date is in future
  const isFutureDate = formData.transaction_date > new Date()
  
  // Auto-set status based on date
  useEffect(() => {
    if (isFutureDate && formData.status === 'completed') {
      setFormData(prev => ({ ...prev, status: 'planned' }))
    }
  }, [isFutureDate])
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount */}
      <div>
        <label className="text-sm font-medium text-primary">Amount</label>
        <Input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            amount: parseFloat(e.target.value) 
          }))}
          required
        />
      </div>
      
      {/* Description */}
      <div>
        <label className="text-sm font-medium text-primary">Description</label>
        <Input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            description: e.target.value 
          }))}
          required
        />
      </div>
      
      {/* Date */}
      <div>
        <label className="text-sm font-medium text-primary">Date</label>
        <Input
          type="date"
          value={format(formData.transaction_date, 'yyyy-MM-dd')}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            transaction_date: new Date(e.target.value) 
          }))}
          max={format(addMonths(new Date(), 6), 'yyyy-MM-dd')} // Max 6 months ahead
          required
        />
        
        {/* Future date indicator */}
        {isFutureDate && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            ℹ️ This will be saved as a planned transaction (won't affect current balance)
          </p>
        )}
      </div>
      
      {/* Status (read-only, auto-determined) */}
      <div className="p-3 bg-glass rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary">Transaction Status:</span>
          <span className={`text-sm font-medium ${
            formData.status === 'planned' 
              ? 'text-amber-600 dark:text-amber-400' 
              : 'text-green-600 dark:text-green-400'
          }`}>
            {formData.status === 'planned' ? '📅 Planned' : '✓ Completed'}
          </span>
        </div>
        <p className="mt-1 text-xs text-secondary">
          {formData.status === 'planned' 
            ? 'This transaction will not affect your current balance until marked as completed.'
            : 'This transaction will immediately affect your account balance.'
          }
        </p>
      </div>
      
      {/* Category, Account, Type fields... */}
      
      <Button type="submit" className="w-full">
        {formData.status === 'planned' ? 'Schedule Transaction' : 'Add Transaction'}
      </Button>
    </form>
  )
}
```

---

## 8. Month Navigation Component

### 8.1 Month Selector

```typescript
// src/components/shared/month-selector.tsx
'use client'

import { useState, useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, isSameMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface MonthSelectorProps {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
  transactionCounts?: Record<string, number> // month key -> count
}

export function MonthSelector({
  selectedMonth,
  onMonthChange,
  transactionCounts = {}
}: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Generate month options (past 12 months + future 12 months)
  const monthOptions = useMemo(() => {
    const options: { date: Date; label: string; count: number }[] = []
    
    for (let i = -12; i <= 12; i++) {
      const date = addMonths(new Date(), i)
      const monthStart = startOfMonth(date)
      const key = format(monthStart, 'yyyy-MM')
      const count = transactionCounts[key] || 0
      
      options.push({
        date: monthStart,
        label: format(monthStart, 'MMMM yyyy'),
        count
      })
    }
    
    return options
  }, [transactionCounts])
  
  const currentOption = monthOptions.find(opt => 
    isSameMonth(opt.date, selectedMonth)
  )
  
  const handlePrevious = () => {
    onMonthChange(subMonths(selectedMonth, 1))
  }
  
  const handleNext = () => {
    onMonthChange(addMonths(selectedMonth, 1))
  }
  
  const handleToday = () => {
    onMonthChange(new Date())
  }
  
  const isCurrentMonth = isSameMonth(selectedMonth, new Date())
  
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handlePrevious}
        aria-label="Previous month"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      
      <div className="relative">
        <Button
          variant="secondary"
          onClick={() => setIsOpen(!isOpen)}
          className="min-w-[200px] justify-between"
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {currentOption?.label}
            {currentOption && currentOption.count > 0 && (
              <span className="text-xs text-secondary">
                ({currentOption.count})
              </span>
            )}
          </span>
        </Button>
        
        {isOpen && (
          <div className="absolute top-full mt-2 left-0 w-64 max-h-96 overflow-y-auto bg-primary border border-primary rounded-lg shadow-lg z-50">
            {monthOptions.map(option => (
              <button
                key={format(option.date, 'yyyy-MM')}
                onClick={() => {
                  onMonthChange(option.date)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-2 text-left hover:bg-glass transition-colors ${
                  isSameMonth(option.date, selectedMonth)
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-primary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {option.count > 0 && (
                    <span className="text-xs text-secondary">
                      {option.count} transactions
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <Button
        variant="secondary"
        size="sm"
        onClick={handleNext}
        aria-label="Next month"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      
      {!isCurrentMonth && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleToday}
        >
          Today
        </Button>
      )}
    </div>
  )
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests for Calculations

**CRITICAL: All calculation logic must have comprehensive tests**

```typescript
// src/lib/forecast/__tests__/average-daily-spending.test.ts

import { describe, it, expect } from 'vitest'
import { calculateAverageDailySpending } from '../average-daily-spending'

describe('calculateAverageDailySpending', () => {
  it('calculates average correctly with sufficient data', () => {
    const transactions = generateMockTransactions(30, {
      type: 'expense',
      amountRange: [50, 200]
    })
    
    const result = calculateAverageDailySpending(transactions, {
      lookbackDays: 30,
      excludeOneTimeLarge: false,
      minimumTransactions: 10
    })
    
    expect(result.averageDailySpending).toBeGreaterThan(0)
    expect(result.confidence).toBe('high')
  })
  
  it('excludes one-time large purchases', () => {
    const transactions = [
      ...generateMockTransactions(29, { amountRange: [50, 100] }),
      createMockTransaction({ amount: 5000 }) // Large one-time
    ]
    
    const withExclusion = calculateAverageDailySpending(transactions, {
      lookbackDays: 30,
      excludeOneTimeLarge: true,
      minimumTransactions: 10
    })
    
    const withoutExclusion = calculateAverageDailySpending(transactions, {
      lookbackDays: 30,
      excludeOneTimeLarge: false,
      minimumTransactions: 10
    })
    
    expect(withExclusion.averageDailySpending).toBeLessThan(
      withoutExclusion.averageDailySpending
    )
  })
  
  it('returns low confidence with insufficient data', () => {
    const transactions = generateMockTransactions(5, {
      type: 'expense'
    })
    
    const result = calculateAverageDailySpending(transactions, {
      lookbackDays: 30,
      excludeOneTimeLarge: true,
      minimumTransactions: 10
    })
    
    expect(result.confidence).toBe('low')
    expect(result.averageDailySpending).toBe(0)
  })
  
  it('handles edge case: no transactions', () => {
    const result = calculateAverageDailySpending([], {
      lookbackDays: 30,
      excludeOneTimeLarge: true,
      minimumTransactions: 10
    })
    
    expect(result.averageDailySpending).toBe(0)
    expect(result.confidence).toBe('low')
  })
})
```

### 9.2 Integration Tests for Forecast

```typescript
// src/lib/forecast/__tests__/daily-forecast.test.ts

describe('calculateDailyForecast', () => {
  it('projects balance correctly with planned transactions', async () => {
    const completed = generateMockTransactions(30, { status: 'completed' })
    const planned = [
      createMockTransaction({ 
        amount: 1000, 
        type: 'expense',
        planned_date: addDays(new Date(), 5),
        status: 'planned'
      })
    ]
    
    const forecasts = await calculateDailyForecast(
      'account-1',
      completed,
      planned,
      {
        startDate: new Date(),
        endDate: addDays(new Date(), 30),
        currentBalance: 5000,
        safetyBufferDays: 7,
        conservativeMultiplier: 1.1
      }
    )
    
    // Find forecast for day 5
    const day5 = forecasts[4]
    
    // Should include the planned expense
    expect(day5.breakdown.plannedExpenses).toBe(1000)
    expect(day5.projectedBalance).toBeLessThan(5000)
  })
  
  it('applies conservative multiplier correctly', async () => {
    const completed = generateMockTransactions(30, {
      type: 'expense',
      amountRange: [100, 100] // Exactly 100 per day
    })
    
    const forecasts = await calculateDailyForecast(
      'account-1',
      completed,
      [],
      {
        startDate: new Date(),
        endDate: addDays(new Date(), 1),
        currentBalance: 5000,
        safetyBufferDays: 7,
        conservativeMultiplier: 1.1
      }
    )
    
    // Average should be 100, but with 1.1x multiplier = 110
    expect(forecasts[0].breakdown.estimatedDailySpending).toBeCloseTo(110, 1)
  })
  
  it('identifies danger days correctly', async () => {
    const forecasts = await calculateDailyForecast(
      'account-1',
      [],
      [
        createMockTransaction({
          amount: 6000,
          type: 'expense',
          planned_date: addDays(new Date(), 5),
          status: 'planned'
        })
      ],
      {
        startDate: new Date(),
        endDate: addDays(new Date(), 30),
        currentBalance: 5000,
        safetyBufferDays: 7,
        conservativeMultiplier: 1.0
      }
    )
    
    const day5 = forecasts[4]
    expect(day5.riskLevel).toBe('danger')
    expect(day5.warnings.length).toBeGreaterThan(0)
  })
})
```

### 9.3 E2E Tests for User Flows

```typescript
// tests/e2e/forecast.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Forecast Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })
  
  test('shows daily forecast chart', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should see forecast chart
    await expect(page.locator('text=Daily Cash Flow Forecast')).toBeVisible()
    
    // Should see risk indicators
    await expect(page.locator('text=Safe:')).toBeVisible()
    await expect(page.locator('text=Warning:')).toBeVisible()
    await expect(page.locator('text=Risk:')).toBeVisible()
  })
  
  test('can add planned transaction', async ({ page }) => {
    await page.goto('/transactions')
    await page.click('button:has-text("Add Transaction")')
    
    // Fill form with future date
    await page.fill('[name="amount"]', '500')
    await page.fill('[name="description"]', 'Future payment')
    await page.fill('[name="transaction_date"]', 
      format(addDays(new Date(), 7), 'yyyy-MM-dd')
    )
    
    // Should show planned status indicator
    await expect(page.locator('text=📅 Planned')).toBeVisible()
    
    await page.click('button[type="submit"]')
    
    // Should appear in upcoming payments
    await page.goto('/dashboard')
    await expect(page.locator('text=Future payment')).toBeVisible()
  })
  
  test('can mark planned transaction as completed', async ({ page }) => {
    // Assuming there's a planned transaction
    await page.goto('/dashboard')
    
    // Find and click "Mark Paid" button
    await page.click('button:has-text("Mark Paid")')
    
    // Should update to completed
    await expect(page.locator('text=Marking...')).toBeVisible()
    await expect(page.locator('text=Marking...')).not.toBeVisible()
    
    // Transaction should move to completed list
    await page.goto('/transactions')
    await expect(page.locator('text=✓ Completed')).toBeVisible()
  })
})
```

---

## 10. Performance Optimization

### 10.1 Caching Strategy

**Forecast calculations are expensive - cache aggressively**

```typescript
// Cache layers:
// 1. In-memory cache (ForecastService) - 5 minutes
// 2. React Query cache (client-side) - 5 minutes
// 3. Invalidate on transaction changes

// src/hooks/use-forecast.ts
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getForecast } from '@/actions/forecast'

export function useForecast(
  workspaceId: string,
  accountId: string | null,
  month: Date
) {
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: ['forecast', workspaceId, accountId, format(month, 'yyyy-MM')],
    queryFn: () => getForecast(workspaceId, accountId, month),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true
  })
}

// Invalidate cache when transactions change
export function useInvalidateForecast() {
  const queryClient = useQueryClient()
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['forecast'] })
  }
}
```

### 10.2 Database Indexes

```sql
-- Critical indexes for forecast queries

-- Transactions by status and date
CREATE INDEX idx_transactions_status_date 
ON transactions(status, transaction_date) 
WHERE deleted_at IS NULL;

-- Planned transactions by date
CREATE INDEX idx_transactions_planned_date 
ON transactions(planned_date) 
WHERE status = 'planned' AND deleted_at IS NULL;

-- Account balances (materialized view refresh)
CREATE INDEX idx_transactions_account_status 
ON transactions(account_id, status) 
WHERE deleted_at IS NULL;
```

---

## 11. Error Handling & Edge Cases

### 11.1 Edge Cases to Handle

1. **No historical data**
   - Show message: "Add more transactions to see forecast"
   - Don't show forecast chart
   - Still allow planned transactions

2. **Insufficient data (< 10 transactions)**
   - Show low confidence warning
   - Use conservative default (e.g., ₴300/day)
   - Explain to user

3. **All transactions are large one-time purchases**
   - Can't calculate meaningful average
   - Show warning
   - Suggest manual review

4. **Future date > 1 year**
   - Block in UI
   - Validation error in server action

5. **Negative current balance**
   - Show in forecast
   - All future days likely danger
   - Highlight urgency

6. **Planned transaction in past**
   - Auto-convert to completed
   - Or show warning to user

### 11.2 Error Messages

```typescript
// User-friendly error messages

const ERROR_MESSAGES = {
  INSUFFICIENT_DATA: 'Add at least 14 days of transactions to see accurate forecasts',
  NO_ACCOUNTS: 'Create an account first to start tracking',
  CALCULATION_ERROR: 'Unable to calculate forecast. Please try again.',
  INVALID_DATE: 'Date must be within the next 6 months',
  NEGATIVE_BALANCE: 'Your current balance is negative. Consider adding income or reducing expenses.',
  LOW_CONFIDENCE: 'Limited data available. Forecast accuracy may be reduced.'
}
```

---

## 12. Security Considerations

### 12.1 Access Control

**CRITICAL: Users must only see their own workspace data**

```typescript
// Every forecast query must verify workspace membership

async function verifyWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()
  
  return !!data
}
```

### 12.2 Data Validation

```typescript
// Validate all inputs before calculations

function validateForecastInputs(
  currentBalance: number,
  startDate: Date,
  endDate: Date
): void {
  if (isNaN(currentBalance)) {
    throw new Error('Invalid balance')
  }
  
  if (startDate > endDate) {
    throw new Error('Start date must be before end date')
  }
  
  if (differenceInDays(endDate, startDate) > 180) {
    throw new Error('Forecast period cannot exceed 6 months')
  }
}
```

---

## 13. Deployment & Rollout

### 13.1 Feature Flag

```typescript
// src/config/feature-flags.ts

export const FEATURE_FLAGS = {
  FUTURE_TRANSACTIONS: process.env.NEXT_PUBLIC_FEATURE_FUTURE_TRANSACTIONS === 'true',
  DAILY_FORECAST: process.env.NEXT_PUBLIC_FEATURE_DAILY_FORECAST === 'true',
  PAYMENT_RISKS: process.env.NEXT_PUBLIC_FEATURE_PAYMENT_RISKS === 'true',
} as const
```

### 13.2 Gradual Rollout Plan

1. **Phase 1: Database migration**
   - Add status column
   - Backfill existing data
   - Verify data integrity

2. **Phase 2: Future transactions (flag off)**
   - Deploy code
   - Test internally
   - Enable for beta users

3. **Phase 3: Forecast calculations (flag off)**
   - Deploy calculation engine
   - Test with real data
   - Monitor performance

4. **Phase 4: Full rollout**
   - Enable all flags
   - Monitor error rates
   - Gather user feedback

---

## 14. Monitoring & Observability

### 14.1 Metrics to Track

```typescript
// Log forecast calculations for debugging

logger.info('Forecast calculated', {
  workspaceId,
  accountId,
  month: format(month, 'yyyy-MM'),
  averageDailySpending,
  confidence,
  safeDays,
  warningDays,
  dangerDays,
  calculationTimeMs: Date.now() - startTime
})
```

### 14.2 Alerts

- Forecast calculation time > 5 seconds
- Error rate > 1%
- Low confidence forecasts > 50%
- Cache hit rate < 80%

---

## 15. Documentation

### 15.1 User-Facing Documentation

**Tooltip content for forecast chart:**
```
Daily Cash Flow Forecast

This chart shows your projected account balance for each day of the month.

Calculation includes:
• Your current balance
• Completed transactions (historical)
• Planned transactions (scheduled)
• Estimated daily spending (based on last 30 days)

Colors indicate risk level:
🟢 Green: Safe - sufficient funds
🟡 Yellow: Warning - balance below 7-day buffer
🔴 Red: Risk - insufficient funds projected

Note: This is an estimate. Actual spending may vary.
```

**Tooltip for planned transactions:**
```
Planned Transactions

Planned transactions are future expenses or income that you expect.

• They do NOT affect your current balance
• They ARE included in forecast calculations
• Mark as "Paid" when the transaction occurs
• They will then affect your actual balance

Use planned transactions to:
• Schedule recurring bills
• Plan for upcoming expenses
• Avoid payment surprises
```

---

## 16. Success Criteria

### 16.1 Technical Success

- ✅ All calculations tested with >90% coverage
- ✅ Forecast calculation time < 2 seconds
- ✅ Cache hit rate > 80%
- ✅ Error rate < 0.5%
- ✅ No data integrity issues

### 16.2 User Success

- ✅ Users understand forecast (survey)
- ✅ Users trust forecast accuracy (survey)
- ✅ Users avoid payment failures (95%+)
- ✅ Users check forecast regularly (60%+)
- ✅ Users feel safe and in control (80%+)

---

## 17. Future Enhancements (Out of Scope)

- Machine learning for better predictions
- Recurring transaction detection
- What-if scenario analysis
- Custom risk thresholds per user
- SMS/email alerts for high-risk payments
- Integration with bank APIs for auto-sync
- Budget vs. actual comparisons
- Savings goal tracking with forecasts

---

## Conclusion

This design provides a **safe, transparent, and accurate** forecast system that helps users avoid payment failures and feel in control of their finances.

**Key Safety Measures:**
1. Conservative estimates (10% safety margin)
2. Clear confidence levels
3. Transparent calculations
4. Data integrity (planned ≠ completed)
5. Comprehensive testing
6. Graceful error handling

**Next Steps:**
1. Review and approve design
2. Create detailed task breakdown
3. Implement database migrations
4. Build calculation engine with tests
5. Create UI components
6. Deploy with feature flags
7. Monitor and iterate
