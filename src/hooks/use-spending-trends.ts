/**
 * Hook for fetching spending trends analysis
 * 
 * Fetches transactions and calculates spending trends for a given month.
 * Follows the same pattern as use-transactions.ts for consistency.
 * 
 * @module hooks/use-spending-trends
 */

import { useQuery } from '@tanstack/react-query'
import supabase from '@/lib/supabase/client'
import { useWorkspace } from '@/contexts/workspace-context'
import { calculateSpendingTrends, type TrendTransaction, type SpendingTrendsResult } from '@/lib/calculations/spending-trends'

/**
 * Hook for fetching and calculating spending trends
 * 
 * @param year - Year to analyze (e.g., 2026)
 * @param month - Month to analyze (1-12)
 * @returns Query result with spending trends data
 * 
 * @example
 * ```typescript
 * const { data, isLoading, error } = useSpendingTrends(2026, 2)
 * 
 * if (data) {
 *   console.log(`Total spending: ${data.totalCurrentMonth}`)
 *   console.log(`Top category: ${data.topCategories[0].categoryName}`)
 * }
 * ```
 */
export function useSpendingTrends(year: number, month: number) {
  const { currentWorkspace } = useWorkspace()
  
  return useQuery({
    queryKey: ['spending-trends', currentWorkspace?.id, year, month],
    queryFn: async (): Promise<SpendingTrendsResult | null> => {
      // SECURITY: Must have a current workspace
      if (!currentWorkspace?.id) {
        return null
      }

      // Fetch transactions for the last 4 months (current + 3 previous for averages)
      // Calculate date range
      const startDate = new Date(year, month - 4, 1) // 4 months back
      const endDate = new Date(year, month, 0) // Last day of current month
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          amount,
          transaction_date,
          type,
          category_id,
          category:categories(name)
        `)
        .eq('workspace_id', currentWorkspace.id) // CRITICAL: Filter by workspace
        .eq('status', 'completed') // Only completed transactions
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch transactions for trends: ${error.message}`)
      }

      if (!data || data.length === 0) {
        // Return empty result structure
        return {
          trends: [],
          totalCurrentMonth: 0,
          totalPreviousMonth: 0,
          overallPercentChange: 0,
          topCategories: [],
          unusualCategories: [],
          averageDailySpending: 0,
        }
      }

      // Transform data to match TrendTransaction interface
      const trendTransactions: TrendTransaction[] = data.map(t => ({
        amount: t.amount,
        transaction_date: t.transaction_date,
        type: t.type as 'income' | 'expense',
        category_id: t.category_id,
        category_name: (t.category as any)?.name || 'Uncategorized',
      }))

      // Calculate spending trends
      const result = calculateSpendingTrends(trendTransactions, year, month)
      
      return result
    },
    enabled: !!currentWorkspace?.id, // Only run query when workspace is available
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (as per design doc)
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always refetch when component mounts
  })
}
