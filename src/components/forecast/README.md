# Daily Forecast Chart Component

## Overview

The `DailyForecastChart` component visualizes projected account balances over time with risk-level color coding and interactive tooltips. It follows the Executive Lounge design aesthetic with smooth curves, glass materials, and warm color accents.

## Features

- **Custom SVG Chart**: No external charting library dependencies
- **Risk-Level Color Coding**: 
  - 🟢 Green (Safe): Balance above safety buffer
  - 🟡 Amber (Warning): Balance below safety buffer
  - 🔴 Red (Danger): Balance below minimum safe threshold
- **Interactive Tooltips**: Hover over data points to see detailed breakdown
- **Smooth Curves**: Liquid-style bezier curves for premium feel
- **Responsive Design**: Scales to container width with viewBox
- **Summary Statistics**: Shows count of safe/warning/danger days
- **Low Confidence Warning**: Alerts users when forecast accuracy may be reduced

## Usage

```tsx
import { DailyForecastChart } from '@/components/forecast/daily-forecast-chart'
import type { DailyForecast } from '@/lib/calculations/daily-forecast'

function ForecastWidget() {
  const forecasts: DailyForecast[] = [
    {
      date: '2024-02-15',
      projectedBalance: 1000,
      confidence: 'high',
      riskLevel: 'safe',
      breakdown: {
        startingBalance: 1100,
        plannedIncome: 50,
        plannedExpenses: 30,
        estimatedDailySpending: 120,
        endingBalance: 1000
      }
    },
    // ... more forecasts
  ]

  return (
    <DailyForecastChart 
      forecasts={forecasts} 
      currency="UAH"
      className="my-custom-class"
    />
  )
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `forecasts` | `DailyForecast[]` | Yes | Array of daily forecast data |
| `currency` | `string` | Yes | Currency code for formatting (e.g., "UAH", "USD") |
| `className` | `string` | No | Additional CSS classes for the wrapper |

## DailyForecast Interface

```typescript
interface DailyForecast {
  date: string                    // ISO date string
  projectedBalance: number        // Projected balance at end of day
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

## Design System Compliance

### Colors (Executive Lounge Aesthetic)

- **Safe (Green)**: `#4E7A58` - Growth Emerald
- **Warning (Amber)**: `#F59E0B` - Amber
- **Danger (Red)**: `#EF4444` - Light Red
- **Gradient Fill**: `#E6A65D` - Single Malt (with opacity)

### Typography

- **Labels**: Inter font family
- **Sizes**: 
  - Axis labels: `text-xs` (12px)
  - Tooltip text: `text-sm` (14px)
  - Summary stats: `text-sm` (14px)

### Materials

- **Glass Cards**: `bg-glass` with `backdrop-blur`
- **Borders**: `border-glass` with subtle transparency
- **Shadows**: Colored shadows matching accent colors

## Responsive Behavior

The chart uses SVG `viewBox` to scale proportionally:
- **Desktop**: Full 800x300px chart area
- **Tablet**: Scales down maintaining aspect ratio
- **Mobile**: Scales down maintaining aspect ratio

Summary stats wrap on smaller screens using `flex-wrap`.

## Accessibility

- **Semantic SVG**: Proper use of SVG elements
- **Color Contrast**: All colors meet WCAG AA standards
- **Hover States**: Clear visual feedback on interaction
- **Tooltips**: Positioned to avoid viewport edges

## Performance

- **Memoization**: Chart calculations memoized with `useMemo`
- **Efficient Rendering**: Only re-renders when forecasts change
- **Smooth Animations**: CSS transitions for hover effects

## Testing

Comprehensive test coverage includes:
- Empty state handling
- Risk level color application
- Summary statistics calculation
- Tooltip interaction
- Responsive SVG rendering
- Low confidence warnings
- Single and multiple data points

Run tests:
```bash
npm run test:autonomous -- tests/unit/components/daily-forecast-chart.test.tsx
```

## Example Scenarios

### Sufficient Data (High Confidence)
```tsx
<DailyForecastChart 
  forecasts={highConfidenceForecasts} 
  currency="UAH"
/>
// Shows chart with no warnings
```

### Limited Data (Low Confidence)
```tsx
<DailyForecastChart 
  forecasts={lowConfidenceForecasts} 
  currency="UAH"
/>
// Shows chart with amber warning banner
```

### No Data
```tsx
<DailyForecastChart 
  forecasts={[]} 
  currency="UAH"
/>
// Shows "No forecast data available" message
```

## Related Components

- `UpcomingPaymentsWidget` - Shows upcoming planned transactions with risk assessment
- `BalanceOverviewWidget` - Shows current balance across accounts
- `MonthSelector` - Allows selecting which month to forecast

## Future Enhancements

- [ ] Zoom/pan functionality for long date ranges
- [ ] Export chart as image
- [ ] Customizable risk thresholds
- [ ] Multiple account comparison view
- [ ] Animation on initial render
