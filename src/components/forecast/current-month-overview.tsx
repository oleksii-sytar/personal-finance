/**
 * Current Month Spending Overview Widget
 * 
 * Simple, practical overview of current month spending with:
 * - Average daily spending (current month only)
 * - Projected total for month
 * - Already spent vs remaining
 * - Planned expenses
 * - Category breakdown
 * 
 * No historical comparisons, no complex trends - just current month data.
 */

'use client'

import { useMemo } from 'react'
import { Calendar, TrendingUp, TrendingDown, Clock, PieChart as PieChartIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import type { TransactionWithCategory } from '@/types/transactions'

interface CurrentMonthOverviewProps {
  /** All transactions for current workspace */
  transactions: TransactionWithCategory[]
  /** Currency code */
  currency: string
  /** Current year */
  year: number
  /** Current month (1-12) */
  month: number
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string
}

interface CategoryTotal {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
  color: string
}

/**
 * Calculate current month spending metrics
 */
function calculateCurrentMonthMetrics(
  transactions: TransactionWithCategory[],
  year: number,
  month: number
) {
  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(year, month, 0).getDate()
  
  // Filter for current month
  const currentMonthTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date)
    return (
      date.getFullYear() === year &&
      date.getMonth() + 1 === month
    )
  })
  
  // Separate by type and status
  const completedExpenses = currentMonthTransactions.filter(t => 
    t.type === 'expense' && t.status === 'completed'
  )
  const plannedExpenses = currentMonthTransactions.filter(t => 
    t.type === 'expense' && t.status === 'planned'
  )
  const completedIncome = currentMonthTransactions.filter(t => 
    t.type === 'income' && t.status === 'completed'
  )
  const plannedIncome = currentMonthTransactions.filter(t => 
    t.type === 'income' && t.status === 'planned'
  )
  
  // Calculate totals
  const alreadySpent = completedExpenses.reduce((sum, t) => sum + t.amount, 0)
  const plannedExpenseAmount = plannedExpenses.reduce((sum, t) => sum + t.amount, 0)
  const earnedIncome = completedIncome.reduce((sum, t) => sum + t.amount, 0)
  const plannedIncomeAmount = plannedIncome.reduce((sum, t) => sum + t.amount, 0)
  
  // Calculate average daily spending (only from completed expenses)
  const averageDailySpending = currentDay > 0 ? alreadySpent / currentDay : 0
  
  // Project total for month based on average
  const projectedTotal = averageDailySpending * daysInMonth
  
  // Calculate remaining projection (excluding planned)
  const daysRemaining = daysInMonth - currentDay
  const projectedRemaining = averageDailySpending * daysRemaining
  
  // Total projected including planned
  const totalProjectedExpenses = alreadySpent + projectedRemaining + plannedExpenseAmount
  const totalProjectedIncome = earnedIncome + plannedIncomeAmount
  
  // Net balance projection
  const netProjected = totalProjectedIncome - totalProjectedExpenses
  
  // Category breakdown (completed expenses only)
  const categoryMap = new Map<string, { name: string; amount: number }>()
  
  completedExpenses.forEach(t => {
    // Skip if no category_id (shouldn't happen but be safe)
    if (!t.category_id) return
    
    const existing = categoryMap.get(t.category_id)
    // Ensure name is always a string, never null
    const categoryName: string = t.category?.name ?? 'Uncategorized'
    if (existing) {
      existing.amount += t.amount
    } else {
      categoryMap.set(t.category_id, {
        name: categoryName,
        amount: t.amount
      })
    }
  })
  
  // Convert to array and calculate percentages
  const categories: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      amount: data.amount,
      percentage: alreadySpent > 0 ? (data.amount / alreadySpent) * 100 : 0,
      color: getCategoryColor(id)
    }))
    .sort((a, b) => b.amount - a.amount)
  
  return {
    currentDay,
    daysInMonth,
    daysRemaining,
    alreadySpent,
    plannedExpenseAmount,
    earnedIncome,
    plannedIncomeAmount,
    averageDailySpending,
    projectedTotal,
    projectedRemaining,
    totalProjectedExpenses,
    totalProjectedIncome,
    netProjected,
    categories,
    completedExpenseCount: completedExpenses.length,
    plannedExpenseCount: plannedExpenses.length,
    completedIncomeCount: completedIncome.length,
    plannedIncomeCount: plannedIncome.length,
  }
}

/**
 * Get consistent color for category (simple hash-based)
 */
function getCategoryColor(categoryId: string): string {
  const colors = [
    '#E6A65D', // Single Malt
    '#4E7A58', // Growth Emerald
    '#8B7355', // Warm Bronze
    '#D97706', // Amber
    '#5C3A21', // Aged Oak
    '#B45309', // Burnt Copper
  ]
  
  // Simple hash
  let hash = 0
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 bg-glass rounded-lg border border-primary/10">
            <div className="h-3 bg-primary/10 rounded w-24 mb-2" />
            <div className="h-6 bg-primary/10 rounded w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <div className="text-center py-8">
      <Calendar className="w-12 h-12 text-secondary mx-auto mb-3 opacity-50" />
      <p className="text-secondary">No transactions this month yet</p>
      <p className="text-xs text-muted mt-1">Add transactions to see your spending overview</p>
    </div>
  )
}

/**
 * Current Month Overview Widget
 */
export function CurrentMonthOverview({
  transactions,
  currency,
  year,
  month,
  isLoading = false,
  error
}: CurrentMonthOverviewProps) {
  const metrics = useMemo(() => 
    calculateCurrentMonthMetrics(transactions, year, month),
    [transactions, year, month]
  )
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Current Month Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Current Month Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">⚠️ {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (metrics.completedExpenseCount === 0 && metrics.plannedExpenseCount === 0 && 
      metrics.completedIncomeCount === 0 && metrics.plannedIncomeCount === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Current Month Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Current Month Overview</CardTitle>
        <p className="text-sm text-secondary mt-1">
          Day {metrics.currentDay} of {metrics.daysInMonth} • {metrics.daysRemaining} days remaining
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Income & Expense Summary */}
          <div className="grid grid-cols-2 gap-4">
            {/* Income Section */}
            <div className="p-4 bg-glass rounded-lg border border-[var(--accent-success)]/20 bg-[var(--accent-success)]/5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[var(--accent-success)]" />
                <p className="text-xs text-[var(--accent-success)]">Income</p>
              </div>
              <p className="text-2xl font-bold text-[var(--accent-success)] font-space-grotesk">
                {formatCurrency(metrics.earnedIncome, currency)}
              </p>
              <p className="text-xs text-[var(--accent-success)]/70 mt-1">
                {metrics.completedIncomeCount} received
              </p>
              {metrics.plannedIncomeAmount > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--accent-success)]/20">
                  <p className="text-xs text-[var(--accent-success)]/70">
                    + {formatCurrency(metrics.plannedIncomeAmount, currency)} planned
                  </p>
                  <p className="text-xs text-[var(--accent-success)]/50">
                    {metrics.plannedIncomeCount} upcoming
                  </p>
                </div>
              )}
            </div>
            
            {/* Expenses Section */}
            <div className="p-4 bg-glass rounded-lg border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-secondary" />
                <p className="text-xs text-secondary">Expenses</p>
              </div>
              <p className="text-2xl font-bold text-primary font-space-grotesk">
                {formatCurrency(metrics.alreadySpent, currency)}
              </p>
              <p className="text-xs text-muted mt-1">
                {metrics.completedExpenseCount} transaction{metrics.completedExpenseCount !== 1 ? 's' : ''}
              </p>
              {metrics.plannedExpenseAmount > 0 && (
                <div className="mt-2 pt-2 border-t border-primary/10">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    + {formatCurrency(metrics.plannedExpenseAmount, currency)} planned
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    {metrics.plannedExpenseCount} upcoming
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Average Daily */}
            <div className="p-4 bg-glass rounded-lg border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-secondary" />
                <p className="text-xs text-secondary">Avg Daily Spending</p>
              </div>
              <p className="text-2xl font-bold text-primary font-space-grotesk">
                {formatCurrency(metrics.averageDailySpending, currency)}
              </p>
              <p className="text-xs text-muted mt-1">
                Based on {metrics.currentDay} day{metrics.currentDay !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Projected Remaining */}
            <div className="p-4 bg-glass rounded-lg border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-secondary" />
                <p className="text-xs text-secondary">Projected Remaining</p>
              </div>
              <p className="text-2xl font-bold text-primary font-space-grotesk">
                {formatCurrency(metrics.projectedRemaining, currency)}
              </p>
              <p className="text-xs text-muted mt-1">
                {metrics.daysRemaining} day{metrics.daysRemaining !== 1 ? 's' : ''} left
              </p>
            </div>
          </div>
          
          {/* Month Projection Summary */}
          <div className="p-4 bg-accent-primary/5 rounded-lg border border-accent-primary/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-primary">Month End Projection</p>
              <p className="text-xs text-secondary">
                Income - Expenses
              </p>
            </div>
            <p className={`text-3xl font-bold font-space-grotesk ${
              metrics.netProjected >= 0 ? 'text-[var(--accent-success)]' : 'text-red-500'
            }`}>
              {metrics.netProjected >= 0 ? '+' : ''}{formatCurrency(metrics.netProjected, currency)}
            </p>
            <div className="mt-3 text-xs text-secondary space-y-1">
              <div className="flex justify-between">
                <span>Total income (earned + planned):</span>
                <span className="text-[var(--accent-success)]">
                  {formatCurrency(metrics.totalProjectedIncome, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total expenses (spent + projected + planned):</span>
                <span className="text-primary">
                  {formatCurrency(metrics.totalProjectedExpenses, currency)}
                </span>
              </div>
              <div className="pt-1 border-t border-primary/10 flex justify-between font-medium">
                <span>Net balance:</span>
                <span className={metrics.netProjected >= 0 ? 'text-[var(--accent-success)]' : 'text-red-500'}>
                  {metrics.netProjected >= 0 ? '+' : ''}{formatCurrency(metrics.netProjected, currency)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Category Breakdown */}
          {metrics.categories.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PieChartIcon className="w-4 h-4 text-secondary" />
                <h3 className="text-sm font-medium text-primary">Category Breakdown</h3>
              </div>
              
              <div className="space-y-2">
                {metrics.categories.slice(0, 5).map(category => (
                  <div key={category.categoryId} className="flex items-center gap-3">
                    {/* Color indicator */}
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    
                    {/* Category name and amount */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-primary truncate">
                          {category.categoryName}
                        </span>
                        <span className="text-sm font-semibold text-primary font-space-grotesk ml-2">
                          {formatCurrency(category.amount, currency)}
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${category.percentage}%`,
                            backgroundColor: category.color
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Percentage */}
                    <span className="text-xs text-secondary w-12 text-right flex-shrink-0">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
                
                {metrics.categories.length > 5 && (
                  <p className="text-xs text-muted text-center mt-2">
                    Showing top 5 of {metrics.categories.length} categories
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
