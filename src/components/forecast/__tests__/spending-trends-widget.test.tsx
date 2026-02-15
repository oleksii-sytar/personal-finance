/**
 * Tests for SpendingTrendsWidget Component
 * 
 * Validates Requirements 2.8: Spending Trends Analysis
 * 
 * Test Coverage:
 * - Rendering with valid data
 * - Top categories highlighting
 * - Trend indicators (↑↓→)
 * - Unusual spending alerts
 * - Percentage change calculations
 * - Progress bars and visualizations
 * - Loading states
 * - Error states
 * - Empty states
 * - Responsive behavior
 * 
 * @module components/forecast/__tests__/spending-trends-widget
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpendingTrendsWidget } from '../spending-trends-widget'
import type { SpendingTrendsResult, SpendingTrend } from '@/lib/calculations/spending-trends'

// Mock data helpers
function createMockTrend(overrides: Partial<SpendingTrend> = {}): SpendingTrend {
  return {
    categoryId: 'cat-1',
    categoryName: 'Groceries',
    currentMonth: 1000,
    previousMonth: 800,
    threeMonthAverage: 900,
    percentChange: 25,
    trend: 'increasing',
    isUnusual: false,
    transactionCount: 5,
    ...overrides,
  }
}

function createMockTrendsResult(overrides: Partial<SpendingTrendsResult> = {}): SpendingTrendsResult {
  const trend1 = createMockTrend({
    categoryId: 'cat-1',
    categoryName: 'Groceries',
    currentMonth: 1000,
    previousMonth: 800,
    percentChange: 25,
    trend: 'increasing',
  })
  
  const trend2 = createMockTrend({
    categoryId: 'cat-2',
    categoryName: 'Transport',
    currentMonth: 500,
    previousMonth: 600,
    percentChange: -16.67,
    trend: 'decreasing',
  })
  
  const trend3 = createMockTrend({
    categoryId: 'cat-3',
    categoryName: 'Entertainment',
    currentMonth: 300,
    previousMonth: 295,
    percentChange: 1.69,
    trend: 'stable',
  })

  return {
    trends: [trend1, trend2, trend3],
    totalCurrentMonth: 1800,
    totalPreviousMonth: 1695,
    overallPercentChange: 6.19,
    topCategories: [trend1, trend2, trend3],
    unusualCategories: [],
    averageDailySpending: 60,
    ...overrides,
  }
}

describe('SpendingTrendsWidget', () => {
  describe('Rendering with Data', () => {
    it('should render widget title', () => {
      const trendsData = createMockTrendsResult()
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('Spending Trends')).toBeInTheDocument()
    })

    it('should display total spending for current month', () => {
      const trendsData = createMockTrendsResult({
        totalCurrentMonth: 1800,
      })
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('Total Spending This Month')).toBeInTheDocument()
      expect(screen.getByText('1 800,00 ₴')).toBeInTheDocument()
    })

    it('should display overall percentage change', () => {
      const trendsData = createMockTrendsResult({
        overallPercentChange: 6.19,
      })
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('vs Last Month')).toBeInTheDocument()
      expect(screen.getByText('+6.2%')).toBeInTheDocument()
    })

    it('should display average daily spending', () => {
      const trendsData = createMockTrendsResult({
        averageDailySpending: 60,
      })
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('Avg Daily')).toBeInTheDocument()
      expect(screen.getByText('60,00 ₴')).toBeInTheDocument()
    })

    it('should display all category trends', () => {
      const trendsData = createMockTrendsResult()
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Transport')).toBeInTheDocument()
      expect(screen.getByText('Entertainment')).toBeInTheDocument()
    })

    it('should display transaction counts for each category', () => {
      const trendsData = createMockTrendsResult()
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      // All three categories have 5 transactions, so we should find all of them
      const transactionCounts = screen.getAllByText('5 transactions')
      expect(transactionCounts).toHaveLength(3)
    })

    it('should display category amounts', () => {
      const trendsData = createMockTrendsResult()
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('1 000,00 ₴')).toBeInTheDocument()
      expect(screen.getByText('500,00 ₴')).toBeInTheDocument()
      expect(screen.getByText('300,00 ₴')).toBeInTheDocument()
    })
  })

  describe('Top Categories Highlighting', () => {
    it('should highlight top 3 categories with rank badges', () => {
      const trendsData = createMockTrendsResult()
      const { container } = render(
        <SpendingTrendsWidget trendsData={trendsData} currency="UAH" />
      )
      
      // Check for rank badges (1, 2, 3)
      const rankBadges = container.querySelectorAll('.bg-accent-primary.text-inverse')
      expect(rankBadges.length).toBeGreaterThan(0)
    })

    it('should apply special styling to top categories', () => {
      const trendsData = createMockTrendsResult()
      const { container } = render(
        <SpendingTrendsWidget trendsData={trendsData} currency="UAH" />
      )
      
      // Check for highlighted background
      const highlightedRows = container.querySelectorAll('.bg-accent-primary\\/5')
      expect(highlightedRows.length).toBeGreaterThan(0)
    })
  })

  describe('Trend Indicators', () => {
    it('should show increasing trend indicator (↑) for positive change', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Groceries',
            percentChange: 25,
            trend: 'increasing',
          }),
        ],
      })
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      const increasingIcons = screen.getAllByLabelText('Increasing')
      expect(increasingIcons.length).toBeGreaterThan(0)
    })

    it('should show decreasing trend indicator (↓) for negative change', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Transport',
            percentChange: -16.67,
            trend: 'decreasing',
          }),
        ],
      })
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      const decreasingIcon = screen.getByLabelText('Decreasing')
      expect(decreasingIcon).toBeInTheDocument()
    })

    it('should show stable trend indicator (→) for minimal change', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Entertainment',
            percentChange: 1.69,
            trend: 'stable',
          }),
        ],
      })
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      const stableIcon = screen.getByLabelText('Stable')
      expect(stableIcon).toBeInTheDocument()
    })

    it('should display percentage change with correct sign', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Groceries',
            percentChange: 25,
          }),
          createMockTrend({
            categoryName: 'Transport',
            percentChange: -16.67,
          }),
        ],
      })
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('+25.0%')).toBeInTheDocument()
      expect(screen.getByText('-16.7%')).toBeInTheDocument()
    })
  })

  describe('Unusual Spending Detection', () => {
    it('should show alert when unusual spending detected', () => {
      const unusualTrend = createMockTrend({
        categoryName: 'Groceries',
        isUnusual: true,
      })
      
      const trendsData = createMockTrendsResult({
        trends: [unusualTrend],
        unusualCategories: [unusualTrend],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('Unusual Spending Detected')).toBeInTheDocument()
    })

    it('should show warning icon for unusual categories', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Groceries',
            isUnusual: true,
          }),
        ],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      const warningIcon = screen.getByLabelText('Unusual spending - significantly different from your 3-month average')
      expect(warningIcon).toBeInTheDocument()
    })

    it('should display count of unusual categories', () => {
      const unusual1 = createMockTrend({
        categoryId: 'cat-1',
        categoryName: 'Groceries',
        isUnusual: true,
      })
      const unusual2 = createMockTrend({
        categoryId: 'cat-2',
        categoryName: 'Transport',
        isUnusual: true,
      })
      
      const trendsData = createMockTrendsResult({
        trends: [unusual1, unusual2],
        unusualCategories: [unusual1, unusual2],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText(/2 categories have spending/)).toBeInTheDocument()
    })

    it('should not show alert when no unusual spending', () => {
      const trendsData = createMockTrendsResult({
        unusualCategories: [],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.queryByText('Unusual Spending Detected')).not.toBeInTheDocument()
    })
  })

  describe('Progress Bars and Visualizations', () => {
    it('should display 3-month average comparison', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Groceries',
            threeMonthAverage: 900,
          }),
        ],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('vs 3-month avg')).toBeInTheDocument()
      expect(screen.getByText('900,00 ₴')).toBeInTheDocument()
    })

    it('should show previous month amount', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Groceries',
            previousMonth: 800,
          }),
        ],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('was 800,00 ₴')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when isLoading is true', () => {
      const { container } = render(
        <SpendingTrendsWidget 
          trendsData={null} 
          currency="UAH" 
          isLoading={true} 
        />
      )
      
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should not show data when loading', () => {
      const trendsData = createMockTrendsResult()
      render(
        <SpendingTrendsWidget 
          trendsData={trendsData} 
          currency="UAH" 
          isLoading={true} 
        />
      )
      
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <SpendingTrendsWidget 
          trendsData={null} 
          currency="UAH" 
          error="Failed to load spending trends" 
        />
      )
      
      expect(screen.getByText(/Failed to load spending trends/)).toBeInTheDocument()
    })

    it('should not show data when error occurs', () => {
      const trendsData = createMockTrendsResult()
      render(
        <SpendingTrendsWidget 
          trendsData={trendsData} 
          currency="UAH" 
          error="Error occurred" 
        />
      )
      
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no trends data', () => {
      render(<SpendingTrendsWidget trendsData={null} currency="UAH" />)
      
      expect(screen.getByText('No spending data yet')).toBeInTheDocument()
    })

    it('should show empty state when trends array is empty', () => {
      const trendsData = createMockTrendsResult({
        trends: [],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('No spending data yet')).toBeInTheDocument()
    })

    it('should show helpful message in empty state', () => {
      render(<SpendingTrendsWidget trendsData={null} currency="UAH" />)
      
      expect(screen.getByText(/Add some expense transactions/)).toBeInTheDocument()
    })
  })

  describe('Max Categories Limit', () => {
    it('should limit displayed categories to maxCategories prop', () => {
      const manyTrends = Array.from({ length: 15 }, (_, i) =>
        createMockTrend({
          categoryId: `cat-${i}`,
          categoryName: `Category ${i}`,
        })
      )
      
      const trendsData = createMockTrendsResult({
        trends: manyTrends,
      })
      
      render(
        <SpendingTrendsWidget 
          trendsData={trendsData} 
          currency="UAH" 
          maxCategories={5} 
        />
      )
      
      // Should show "Showing top 5 of 15 categories"
      expect(screen.getByText(/Showing top 5 of 15 categories/)).toBeInTheDocument()
    })

    it('should not show "showing more" message when all categories fit', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({ categoryId: 'cat-1', categoryName: 'Cat 1' }),
          createMockTrend({ categoryId: 'cat-2', categoryName: 'Cat 2' }),
        ],
      })
      
      render(
        <SpendingTrendsWidget 
          trendsData={trendsData} 
          currency="UAH" 
          maxCategories={10} 
        />
      )
      
      expect(screen.queryByText(/Showing top/)).not.toBeInTheDocument()
    })
  })

  describe('Currency Formatting', () => {
    it('should format amounts with UAH currency', () => {
      const trendsData = createMockTrendsResult({
        totalCurrentMonth: 1800,
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('1 800,00 ₴')).toBeInTheDocument()
    })

    it('should format amounts with USD currency', () => {
      const trendsData = createMockTrendsResult({
        totalCurrentMonth: 1800,
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="USD" />)
      
      expect(screen.getByText('1 800,00 USD')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible labels for trend indicators', () => {
      const trendsData = createMockTrendsResult()
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      // Use getAllByLabelText since there are multiple indicators
      expect(screen.getAllByLabelText('Increasing').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Decreasing').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Stable').length).toBeGreaterThan(0)
    })

    it('should have accessible label for unusual spending indicator', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Groceries',
            isUnusual: true,
          }),
        ],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByLabelText('Unusual spending - significantly different from your 3-month average')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero spending gracefully', () => {
      const trendsData = createMockTrendsResult({
        totalCurrentMonth: 0,
        trends: [],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('No spending data yet')).toBeInTheDocument()
    })

    it('should handle zero percent change', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Groceries',
            currentMonth: 100,
            previousMonth: 100,
            percentChange: 0,
            trend: 'stable',
          }),
        ],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('should handle single transaction category', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Groceries',
            transactionCount: 1,
          }),
        ],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('1 transaction')).toBeInTheDocument()
    })

    it('should handle very large percentage changes', () => {
      const trendsData = createMockTrendsResult({
        trends: [
          createMockTrend({
            categoryName: 'Groceries',
            percentChange: 250.5,
            trend: 'increasing',
          }),
        ],
      })
      
      render(<SpendingTrendsWidget trendsData={trendsData} currency="UAH" />)
      
      expect(screen.getByText('+250.5%')).toBeInTheDocument()
    })
  })
})
