/**
 * Spending Trends Widget Component
 * 
 * Displays spending trends analysis with category breakdowns, percentage changes,
 * and trend indicators. Highlights unusual spending patterns and top categories.
 * 
 * Implements Requirements 2.8: Spending Trends Analysis
 * 
 * Features:
 * - Shows spending by category for selected month
 * - Comparison to previous month (% change)
 * - Comparison to 3-month average
 * - Identifies unusual spending patterns
 * - Top 3 spending categories highlighted
 * - Average daily spending calculation
 * - Trend direction indicators (↑↓→)
 * - Visual charts and progress bars
 * - Loading and error states
 * - Empty state handling
 * 
 * @module components/forecast/spending-trends-widget
 */

'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, Receipt } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { HelpIcon } from '@/components/ui/help-icon'
import { EmptyStateWithAction } from '@/components/shared/empty-state-with-action'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { HELP_TEXT } from '@/lib/constants/help-text'
import type { SpendingTrendsResult, SpendingTrend } from '@/lib/calculations/spending-trends'

interface SpendingTrendsWidgetProps {
  /** Spending trends analysis result */
  trendsData: SpendingTrendsResult | null
  /** Currency code (e.g., 'UAH', 'USD') */
  currency: string
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string
  /** Maximum number of categories to display */
  maxCategories?: number
}

/**
 * Trend indicator icon component
 */
function TrendIndicator({ trend }: { trend: 'increasing' | 'decreasing' | 'stable' }) {
  if (trend === 'increasing') {
    return <TrendingUp className="w-4 h-4 text-red-500" aria-label="Increasing" />
  }
  if (trend === 'decreasing') {
    return <TrendingDown className="w-4 h-4 text-[var(--accent-success)]" aria-label="Decreasing" />
  }
  return <Minus className="w-4 h-4 text-secondary" aria-label="Stable" />
}

/**
 * Category trend row component
 */
function CategoryTrendRow({ 
  trend, 
  currency,
  isTopCategory,
  rank
}: { 
  trend: SpendingTrend
  currency: string
  isTopCategory: boolean
  rank?: number
}) {
  const percentageDisplay = trend.percentChange === 0 
    ? '0%' 
    : `${trend.percentChange > 0 ? '+' : ''}${trend.percentChange.toFixed(1)}%`

  return (
    <div className={cn(
      "py-3 border-b border-primary/10 last:border-0",
      isTopCategory && "bg-accent-primary/5 -mx-4 px-4 rounded-lg"
    )}>
      <div className="flex items-start justify-between gap-3">
        {/* Category Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Rank Badge for Top Categories */}
            {isTopCategory && rank && (
              <span className="flex items-center justify-center w-5 h-5 bg-accent-primary text-inverse text-xs font-bold rounded-full flex-shrink-0">
                {rank}
              </span>
            )}
            
            <span className={cn(
              "font-medium truncate",
              isTopCategory ? "text-accent-primary" : "text-primary"
            )}>
              {trend.categoryName}
            </span>
            
            {/* Unusual Spending Indicator */}
            {trend.isUnusual && (
              <AlertTriangle 
                className="w-4 h-4 text-amber-500 flex-shrink-0" 
                aria-label="Unusual spending - significantly different from your 3-month average"
              />
            )}
          </div>
          
          {/* Transaction Count */}
          <p className="text-xs text-secondary">
            {trend.transactionCount} transaction{trend.transactionCount !== 1 ? 's' : ''}
          </p>
          
          {/* Progress Bar - Current vs 3-Month Average */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-secondary mb-1">
              <span>vs 3-month avg</span>
              <span>{formatCurrency(trend.threeMonthAverage, currency)}</span>
            </div>
            <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  trend.currentMonth > trend.threeMonthAverage 
                    ? "bg-red-500" 
                    : "bg-[var(--accent-success)]"
                )}
                style={{ 
                  width: `${Math.min(
                    (trend.currentMonth / Math.max(trend.threeMonthAverage, trend.currentMonth)) * 100,
                    100
                  )}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Amount and Trend */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-2 justify-end mb-1">
            <TrendIndicator trend={trend.trend} />
            <p className="font-semibold text-primary font-space-grotesk">
              {formatCurrency(trend.currentMonth, currency)}
            </p>
          </div>
          
          {/* Percentage Change */}
          <p className={cn(
            "text-xs font-medium",
            trend.percentChange > 0 ? "text-red-500" : 
            trend.percentChange < 0 ? "text-[var(--accent-success)]" : 
            "text-secondary"
          )}>
            {percentageDisplay}
          </p>
          
          {/* Previous Month Amount */}
          <p className="text-xs text-muted">
            was {formatCurrency(trend.previousMonth, currency)}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty state component with guidance and action
 */
function EmptyState() {
  return (
    <EmptyStateWithAction
      icon={Receipt}
      title="No Spending Data Yet"
      description="Add expense transactions to see your spending trends, category breakdowns, and month-over-month comparisons."
      guidance="Track at least 2 weeks of expenses to see meaningful trends and patterns in your spending habits."
      action={{
        label: "Add Transactions",
        href: "/transactions"
      }}
    />
  )
}

/**
 * Loading skeleton component
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary Skeleton */}
      <div className="p-4 bg-glass rounded-lg border border-primary/10 animate-pulse">
        <div className="h-4 bg-primary/10 rounded w-32 mb-2" />
        <div className="h-8 bg-primary/10 rounded w-40 mb-3" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-3 bg-primary/10 rounded w-24 mb-1" />
            <div className="h-5 bg-primary/10 rounded w-32" />
          </div>
          <div>
            <div className="h-3 bg-primary/10 rounded w-24 mb-1" />
            <div className="h-5 bg-primary/10 rounded w-32" />
          </div>
        </div>
      </div>
      
      {/* Category Rows Skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between py-3 border-b border-primary/10 animate-pulse"
        >
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-primary/10 rounded w-32" />
            <div className="h-3 bg-primary/10 rounded w-20" />
            <div className="h-1.5 bg-primary/10 rounded w-full" />
          </div>
          <div className="space-y-1 text-right">
            <div className="h-5 bg-primary/10 rounded w-24" />
            <div className="h-3 bg-primary/10 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
      <p className="text-sm text-red-600 dark:text-red-400">
        ⚠️ {message}
      </p>
    </div>
  )
}

/**
 * Spending Trends Widget
 * 
 * Main component that displays spending trends analysis with visualizations.
 */
export function SpendingTrendsWidget({
  trendsData,
  currency,
  isLoading = false,
  error,
  maxCategories = 10,
}: SpendingTrendsWidgetProps) {
  // Get top categories to display
  const displayTrends = useMemo(() => {
    if (!trendsData) return []
    return trendsData.trends.slice(0, maxCategories)
  }, [trendsData, maxCategories])

  // Identify top 3 category IDs for highlighting
  const topCategoryIds = useMemo(() => {
    if (!trendsData) return new Set<string>()
    return new Set(trendsData.topCategories.map(t => t.categoryId))
  }, [trendsData])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Spending Trends</CardTitle>
          <HelpIcon content={HELP_TEXT.SPENDING_TRENDS.content} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Loading State */}
          {isLoading && <LoadingSkeleton />}

          {/* Error State */}
          {error && !isLoading && <ErrorState message={error} />}

          {/* Empty State */}
          {!isLoading && !error && (!trendsData || trendsData.trends.length === 0) && (
            <EmptyState />
          )}

          {/* Trends Data */}
          {!isLoading && !error && trendsData && trendsData.trends.length > 0 && (
            <>
              {/* Summary Card */}
              <div className="p-4 bg-glass rounded-lg border border-primary/10">
                <p className="text-sm text-secondary mb-1">Total Spending This Month</p>
                <p className="text-3xl font-bold text-primary font-space-grotesk mb-3">
                  {formatCurrency(trendsData.totalCurrentMonth, currency)}
                </p>
                
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-primary/10">
                  {/* Overall Change */}
                  <div>
                    <p className="text-xs text-secondary mb-1">vs Last Month</p>
                    <div className="flex items-center gap-2">
                      <TrendIndicator 
                        trend={
                          trendsData.overallPercentChange > 5 ? 'increasing' :
                          trendsData.overallPercentChange < -5 ? 'decreasing' :
                          'stable'
                        } 
                      />
                      <p className={cn(
                        "text-sm font-semibold font-space-grotesk",
                        trendsData.overallPercentChange > 0 ? "text-red-500" :
                        trendsData.overallPercentChange < 0 ? "text-[var(--accent-success)]" :
                        "text-secondary"
                      )}>
                        {trendsData.overallPercentChange > 0 ? '+' : ''}
                        {trendsData.overallPercentChange.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Average Daily Spending */}
                  <div>
                    <p className="text-xs text-secondary mb-1">Avg Daily</p>
                    <p className="text-sm font-semibold text-primary font-space-grotesk">
                      {formatCurrency(trendsData.averageDailySpending, currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Unusual Spending Alert */}
              {trendsData.unusualCategories.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Unusual Spending Detected
                      </p>
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                        {trendsData.unusualCategories.length} categor{trendsData.unusualCategories.length === 1 ? 'y has' : 'ies have'} spending 
                        significantly different from your 3-month average
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Category List */}
              <div>
                <h3 className="text-sm font-medium text-secondary mb-3">
                  Categories ({trendsData.trends.length})
                </h3>
                <div className="space-y-0">
                  {displayTrends.map((trend, index) => {
                    const isTopCategory = topCategoryIds.has(trend.categoryId)
                    const rank = isTopCategory 
                      ? trendsData.topCategories.findIndex(t => t.categoryId === trend.categoryId) + 1
                      : undefined
                    
                    return (
                      <CategoryTrendRow
                        key={trend.categoryId}
                        trend={trend}
                        currency={currency}
                        isTopCategory={isTopCategory}
                        rank={rank}
                      />
                    )
                  })}
                </div>
                
                {/* Show More Indicator */}
                {trendsData.trends.length > maxCategories && (
                  <p className="text-xs text-muted text-center mt-3">
                    Showing top {maxCategories} of {trendsData.trends.length} categories
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
