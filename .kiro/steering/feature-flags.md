# Forma - Feature Flags & Graceful Degradation

## Overview

This document defines how to handle incomplete functionality, feature flags, and graceful degradation patterns. When implementing features incrementally, use these patterns to ensure the app remains stable and usable.

## Core Principles

1. **Never break the user experience** - Incomplete features should be invisible or clearly marked
2. **Fail gracefully** - Missing dependencies should not crash the app
3. **Be transparent** - If something is coming soon, tell the user
4. **Easy rollback** - Any feature can be disabled instantly

## Feature Flag System

### Configuration

```typescript
// src/config/feature-flags.ts

export const FEATURE_FLAGS = {
  // Core features
  MULTI_CURRENCY: process.env.NEXT_PUBLIC_FEATURE_MULTI_CURRENCY === 'true',
  RECURRING_TRANSACTIONS: process.env.NEXT_PUBLIC_FEATURE_RECURRING === 'true',
  FORECASTING: process.env.NEXT_PUBLIC_FEATURE_FORECASTING === 'true',
  GOAL_SETTING: process.env.NEXT_PUBLIC_FEATURE_GOALS === 'true',
  DEBT_SNOWBALL: process.env.NEXT_PUBLIC_FEATURE_DEBT_SNOWBALL === 'true',
  
  // Experimental features
  AI_CATEGORIZATION: process.env.NEXT_PUBLIC_FEATURE_AI_CATEGORIZATION === 'true',
  BANK_IMPORT: process.env.NEXT_PUBLIC_FEATURE_BANK_IMPORT === 'true',
  
  // Infrastructure
  REALTIME_SYNC: process.env.NEXT_PUBLIC_FEATURE_REALTIME === 'true',
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] ?? false
}
```

### Usage in Components

```typescript
// Feature gate component
import { isFeatureEnabled } from '@/config/feature-flags'

interface FeatureGateProps {
  feature: FeatureFlag
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback = null 
}: FeatureGateProps) {
  if (!isFeatureEnabled(feature)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

// Usage
<FeatureGate feature="FORECASTING" fallback={<ComingSoonBadge />}>
  <ForecastChart />
</FeatureGate>
```

### Usage in Server Actions

```typescript
// src/actions/forecasting.ts
'use server'

import { isFeatureEnabled } from '@/config/feature-flags'

export async function calculateForecast(workspaceId: string) {
  if (!isFeatureEnabled('FORECASTING')) {
    return { 
      error: 'FEATURE_DISABLED',
      message: 'Forecasting is not yet available' 
    }
  }
  
  // Actual implementation
}
```

## Graceful Degradation Patterns

### Pattern 1: Coming Soon Placeholder

Use when a feature is planned but not yet implemented.

```typescript
// src/components/shared/coming-soon.tsx
interface ComingSoonProps {
  title: string
  description?: string
  icon?: React.ReactNode
}

export function ComingSoon({ 
  title, 
  description = 'This feature is coming in a future update.',
  icon 
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
      <span className="mt-4 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-medium">
        Coming Soon
      </span>
    </div>
  )
}
```

### Pattern 2: Dependency Check

Use when a feature depends on another component/service.

```typescript
// src/components/dashboard/forecast-widget.tsx
import { useForecast } from '@/hooks/use-forecast'
import { isFeatureEnabled } from '@/config/feature-flags'

export function ForecastWidget() {
  const { data, isLoading, error } = useForecast()
  
  // Feature not enabled
  if (!isFeatureEnabled('FORECASTING')) {
    return <ComingSoon title="Daily Forecast" />
  }
  
  // Dependency missing (e.g., not enough historical data)
  if (error?.code === 'INSUFFICIENT_DATA') {
    return (
      <DependencyNotice 
        title="Forecast Unavailable"
        message="Complete at least one month of transactions to enable forecasting."
        action={{ label: 'Add Transactions', href: '/transactions/new' }}
      />
    )
  }
  
  // Loading state
  if (isLoading) {
    return <ForecastWidgetSkeleton />
  }
  
  // Success state
  return <ForecastChart data={data} />
}
```

### Pattern 3: Disabled State

Use when an action can't be performed due to missing requirements.

```typescript
// src/components/transactions/bulk-actions.tsx
interface BulkActionsProps {
  selectedIds: string[]
}

export function BulkActions({ selectedIds }: BulkActionsProps) {
  const hasCategoryFeature = isFeatureEnabled('BULK_CATEGORIZE')
  const hasExportFeature = isFeatureEnabled('EXPORT_CSV')
  
  return (
    <div className="flex gap-2">
      <Button
        disabled={!hasCategoryFeature || selectedIds.length === 0}
        onClick={handleBulkCategorize}
      >
        Categorize
        {!hasCategoryFeature && <ComingSoonBadge inline />}
      </Button>
      
      <Button
        disabled={!hasExportFeature || selectedIds.length === 0}
        onClick={handleExport}
      >
        Export
        {!hasExportFeature && <ComingSoonBadge inline />}
      </Button>
    </div>
  )
}
```

### Pattern 4: External Service Fallback

Use when external services (NBU API, etc.) might be unavailable.

```typescript
// src/lib/utils/currency.ts
import { getCachedExchangeRate, getLatestExchangeRate } from '@/lib/nbu-api'

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
  date: Date
): Promise<{ amount: number; source: 'live' | 'cached' | 'fallback' }> {
  // If same currency, no conversion needed
  if (from === to) {
    return { amount, source: 'live' }
  }
  
  // Try live rate first
  try {
    const rate = await getLatestExchangeRate(from, to, date)
    return { amount: amount * rate, source: 'live' }
  } catch (error) {
    console.warn('NBU API unavailable, using cached rate')
  }
  
  // Fall back to cached rate
  const cachedRate = await getCachedExchangeRate(from, to, date)
  if (cachedRate) {
    return { amount: amount * cachedRate.rate, source: 'cached' }
  }
  
  // Last resort: use hardcoded fallback rate (should be rare)
  const fallbackRate = FALLBACK_RATES[`${from}_${to}`]
  if (fallbackRate) {
    console.error('Using fallback exchange rate - this should be investigated')
    return { amount: amount * fallbackRate, source: 'fallback' }
  }
  
  throw new Error(`Unable to convert ${from} to ${to}`)
}
```

## UI Patterns for Incomplete Features

### Navigation Items

```typescript
// Disabled nav item with tooltip
<NavItem 
  href="/goals" 
  disabled={!isFeatureEnabled('GOAL_SETTING')}
  badge="Soon"
>
  Goals
</NavItem>
```

### Form Fields

```typescript
// Disabled form section
<fieldset disabled={!isFeatureEnabled('RECURRING_TRANSACTIONS')}>
  <legend className="flex items-center gap-2">
    Recurring Settings
    {!isFeatureEnabled('RECURRING_TRANSACTIONS') && (
      <Badge variant="outline">Coming Soon</Badge>
    )}
  </legend>
  {/* form fields */}
</fieldset>
```

### Dashboard Widgets

```typescript
// Empty state for future widget
{isFeatureEnabled('FORECASTING') ? (
  <ForecastWidget />
) : (
  <WidgetPlaceholder 
    title="Daily Forecast"
    subtitle="Predict your daily balances"
    availableIn="v1.2"
  />
)}
```

## Environment Configuration

### Development (all features enabled for testing)
```env
NEXT_PUBLIC_FEATURE_MULTI_CURRENCY=true
NEXT_PUBLIC_FEATURE_RECURRING=true
NEXT_PUBLIC_FEATURE_FORECASTING=true
NEXT_PUBLIC_FEATURE_GOALS=true
NEXT_PUBLIC_FEATURE_DEBT_SNOWBALL=true
NEXT_PUBLIC_FEATURE_AI_CATEGORIZATION=true
NEXT_PUBLIC_FEATURE_REALTIME=true
```

### Staging (match production + testing new features)
```env
NEXT_PUBLIC_FEATURE_MULTI_CURRENCY=true
NEXT_PUBLIC_FEATURE_RECURRING=true
NEXT_PUBLIC_FEATURE_FORECASTING=false  # Testing in next release
NEXT_PUBLIC_FEATURE_GOALS=false
NEXT_PUBLIC_FEATURE_DEBT_SNOWBALL=false
NEXT_PUBLIC_FEATURE_AI_CATEGORIZATION=false
NEXT_PUBLIC_FEATURE_REALTIME=false
```

### Production (only released features)
```env
NEXT_PUBLIC_FEATURE_MULTI_CURRENCY=true
NEXT_PUBLIC_FEATURE_RECURRING=true
NEXT_PUBLIC_FEATURE_FORECASTING=false
NEXT_PUBLIC_FEATURE_GOALS=false
NEXT_PUBLIC_FEATURE_DEBT_SNOWBALL=false
NEXT_PUBLIC_FEATURE_AI_CATEGORIZATION=false
NEXT_PUBLIC_FEATURE_REALTIME=false
```

## Error Boundaries

Always wrap feature areas with error boundaries:

```typescript
// src/components/shared/feature-error-boundary.tsx
'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  featureName: string
}

interface State {
  hasError: boolean
}

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.featureName}:`, error, errorInfo)
    // Report to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded bg-red-50">
          <p className="text-red-800">
            Unable to load {this.props.featureName}. 
            Please try refreshing the page.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
```

## Best Practices Summary

1. **Always use feature flags** for new features in development
2. **Provide meaningful fallbacks** - don't just hide things
3. **Log degradation events** - so you know when fallbacks are triggered
4. **Test with features disabled** - ensure app works without optional features
5. **Document feature dependencies** - in the feature specification
6. **Communicate to users** - when something is coming soon vs. unavailable
7. **Plan for failure** - external services will go down, handle it gracefully
