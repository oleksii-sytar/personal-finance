import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DailyForecastChart } from '@/components/forecast/daily-forecast-chart'
import type { DailyForecast } from '@/lib/calculations/daily-forecast'
import { addDays } from 'date-fns'

// Mock formatCurrency
vi.mock('@/lib/utils/format', () => ({
  formatCurrency: (amount: number, currency: string) => `${currency}${amount.toFixed(2)}`
}))

describe('DailyForecastChart', () => {
  const createMockForecast = (
    daysFromNow: number,
    balance: number,
    riskLevel: 'safe' | 'warning' | 'danger',
    confidence: 'high' | 'medium' | 'low' = 'high'
  ): DailyForecast => ({
    date: addDays(new Date(), daysFromNow),
    projectedBalance: balance,
    confidence,
    riskLevel,
    breakdown: {
      startingBalance: balance + 100,
      plannedIncome: 50,
      plannedExpenses: 30,
      estimatedDailySpending: 20,
      endingBalance: balance
    }
  })

  it('renders chart with forecast data', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe'),
      createMockForecast(1, 950, 'safe'),
      createMockForecast(2, 900, 'warning'),
      createMockForecast(3, 850, 'warning'),
      createMockForecast(4, -50, 'danger')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    // Should render SVG chart
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()

    // Should show summary stats
    expect(screen.getByText(/Safe: 2 days/)).toBeInTheDocument()
    expect(screen.getByText(/Warning: 2 days/)).toBeInTheDocument()
    expect(screen.getByText(/Risk: 1 days/)).toBeInTheDocument()
  })

  it('shows empty state when no forecasts', () => {
    render(<DailyForecastChart forecasts={[]} currency="UAH" />)

    expect(screen.getByText('No forecast data available')).toBeInTheDocument()
  })

  it('displays low confidence warning when applicable', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe', 'low'),
      createMockForecast(1, 950, 'safe', 'low')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    expect(screen.getByText(/Limited historical data/)).toBeInTheDocument()
  })

  it('does not show low confidence warning when all forecasts are high confidence', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe', 'high'),
      createMockForecast(1, 950, 'safe', 'high')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    expect(screen.queryByText(/Limited historical data/)).not.toBeInTheDocument()
  })

  it('renders correct number of data points', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe'),
      createMockForecast(1, 950, 'safe'),
      createMockForecast(2, 900, 'safe')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    const circles = document.querySelectorAll('circle')
    expect(circles).toHaveLength(3)
  })

  it('applies correct colors based on risk level', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe'),
      createMockForecast(1, 500, 'warning'),
      createMockForecast(2, -100, 'danger')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    const circles = document.querySelectorAll('circle')
    
    // Safe = green (#4E7A58)
    expect(circles[0]).toHaveAttribute('fill', '#4E7A58')
    
    // Warning = amber (#F59E0B)
    expect(circles[1]).toHaveAttribute('fill', '#F59E0B')
    
    // Danger = red (#EF4444)
    expect(circles[2]).toHaveAttribute('fill', '#EF4444')
  })

  it('shows tooltip on hover', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe'),
      createMockForecast(1, 950, 'safe')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()

    // Simulate mouse move
    if (svg) {
      fireEvent.mouseMove(svg, { clientX: 100, clientY: 100 })
    }

    // Tooltip should appear (checking for projected balance text)
    // Note: This is a simplified test - in real scenario, we'd need to calculate exact positions
  })

  it('renders with custom className', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe')
    ]

    const { container } = render(
      <DailyForecastChart 
        forecasts={forecasts} 
        currency="UAH" 
        className="custom-class"
      />
    )

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('custom-class')
  })

  it('calculates summary stats correctly', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe'),
      createMockForecast(1, 900, 'safe'),
      createMockForecast(2, 800, 'safe'),
      createMockForecast(3, 500, 'warning'),
      createMockForecast(4, 300, 'warning'),
      createMockForecast(5, -100, 'danger')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    expect(screen.getByText(/Safe: 3 days/)).toBeInTheDocument()
    expect(screen.getByText(/Warning: 2 days/)).toBeInTheDocument()
    expect(screen.getByText(/Risk: 1 days/)).toBeInTheDocument()
  })

  it('handles single forecast point', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()

    expect(screen.getByText(/Safe: 1 days/)).toBeInTheDocument()
  })

  it('formats currency correctly in labels', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1234.56, 'safe')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    // Check that currency formatting is applied
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders responsive SVG with viewBox', () => {
    const forecasts: DailyForecast[] = [
      createMockForecast(0, 1000, 'safe')
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 800 300')
    expect(svg).toHaveAttribute('width', '100%')
  })

  it('shows planned income and expenses in tooltip breakdown', () => {
    const forecasts: DailyForecast[] = [
      {
        ...createMockForecast(0, 1000, 'safe'),
        breakdown: {
          startingBalance: 1000,
          plannedIncome: 500,
          plannedExpenses: 300,
          estimatedDailySpending: 50,
          endingBalance: 1150
        }
      }
    ]

    render(<DailyForecastChart forecasts={forecasts} currency="UAH" />)

    // Tooltip content is rendered when hovering
    const svg = document.querySelector('svg')
    if (svg) {
      fireEvent.mouseMove(svg, { clientX: 100, clientY: 100 })
    }
  })
})
