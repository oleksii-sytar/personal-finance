import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import supabase from '@/lib/supabase/client'
import { createTransaction, updateTransaction, deleteTransaction } from '@/actions/transactions'
import { useWorkspace } from '@/contexts/workspace-context'
import type { Transaction, TransactionWithCategory, TransactionFilters, ActionResult } from '@/types'

/**
 * Hook for fetching transactions with optional filtering
 * Following code-quality.md naming and structure patterns
 * SECURITY: Always filters by current workspace ID
 * Implements Requirements 4.2: Month filtering logic
 */
export function useTransactions(filters?: {
  categories?: string[]
  type?: 'income' | 'expense'
  startDate?: Date
  endDate?: Date
  month?: string // Format: YYYY-MM
}) {
  const { currentWorkspace } = useWorkspace()
  
  return useQuery({
    queryKey: ['transactions', currentWorkspace?.id, filters],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache at all
    queryFn: async (): Promise<TransactionWithCategory[]> => {
      // SECURITY: Must have a current workspace
      if (!currentWorkspace?.id) {
        return []
      }

      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('workspace_id', currentWorkspace.id) // CRITICAL: Filter by workspace
        .order('transaction_date', { ascending: false }) // Most recent transaction date first

      // Apply additional filters
      if (filters?.categories?.length) {
        query = query.in('category_id', filters.categories)
      }
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      
      // Month filtering takes precedence over startDate/endDate
      if (filters?.month) {
        // Parse month string (YYYY-MM) and create date range using UTC to avoid timezone issues
        const [year, month] = filters.month.split('-').map(Number)
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1))
        const endOfMonth = new Date(Date.UTC(year, month, 0)) // Last day of month
        
        // For planned transactions, use planned_date; for completed, use transaction_date
        // We need to fetch all and filter in memory since we can't do OR conditions easily in Supabase
        const startDateStr = startOfMonth.toISOString().split('T')[0]
        const endDateStr = endOfMonth.toISOString().split('T')[0]
        
        console.log('[useTransactions] Month filter:', filters.month)
        console.log('[useTransactions] Date range:', startDateStr, 'to', endDateStr)
        
        // Fetch all transactions for the workspace and filter in memory
        const { data: allData, error: allError } = await query
        
        if (allError) {
          throw new Error(`Failed to fetch transactions: ${allError.message}`)
        }
        
        console.log('[useTransactions] Fetched transactions:', allData?.length)
        
        // Filter by the appropriate date field based on status
        const filteredData = (allData || []).filter(t => {
          const dateToCheck = t.status === 'planned' ? t.planned_date : t.transaction_date
          const isInRange = dateToCheck >= startDateStr && dateToCheck <= endDateStr
          
          if (!isInRange) {
            console.log('[useTransactions] EXCLUDING:', t.description, 'date:', dateToCheck, 'status:', t.status)
          }
          
          return isInRange
        })
        
        console.log('[useTransactions] Filtered transactions:', filteredData.length)
        
        return filteredData
      } else {
        // Apply date range filters only if month filter is not present
        if (filters?.startDate) {
          query = query.gte('transaction_date', filters.startDate.toISOString().split('T')[0])
        }
        if (filters?.endDate) {
          query = query.lte('transaction_date', filters.endDate.toISOString().split('T')[0])
        }
        
        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch transactions: ${error.message}`)
        }

        return data || []
      }
    },
    enabled: !!currentWorkspace?.id, // Only run query when workspace is available
  })
}

/**
 * Hook for infinite scroll transactions with pagination
 * Implements Requirements 3.1, 3.5: Most recent first ordering and infinite scroll
 * SECURITY: Always filters by current workspace ID
 */
export function useInfiniteTransactions(
  filters?: TransactionFilters,
  pageSize: number = 20
) {
  const { currentWorkspace } = useWorkspace()
  
  return useInfiniteQuery({
    queryKey: ['transactions-infinite', currentWorkspace?.id, filters, pageSize],
    queryFn: async ({ pageParam = 0 }): Promise<{
      transactions: TransactionWithCategory[]
      nextCursor: number | null
      hasMore: boolean
    }> => {
      // SECURITY: Must have a current workspace
      if (!currentWorkspace?.id) {
        return {
          transactions: [],
          nextCursor: null,
          hasMore: false
        }
      }

      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('workspace_id', currentWorkspace.id) // CRITICAL: Filter by workspace
        .order('transaction_date', { ascending: false }) // Most recent transaction date first
        .range(pageParam, pageParam + pageSize - 1)

      // Apply additional filters
      if (filters?.categories?.length) {
        query = query.in('category_id', filters.categories)
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }
      if (filters?.searchQuery) {
        query = query.ilike('notes', `%${filters.searchQuery}%`)
      }
      if (filters?.dateRange?.start) {
        query = query.gte('transaction_date', filters.dateRange.start.toISOString().split('T')[0])
      }
      if (filters?.dateRange?.end) {
        query = query.lte('transaction_date', filters.dateRange.end.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`)
      }

      const transactions = data || []
      const hasMore = transactions.length === pageSize
      const nextCursor = hasMore ? pageParam + pageSize : null

      return {
        transactions,
        nextCursor,
        hasMore
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!currentWorkspace?.id, // Only run query when workspace is available
  })
}

/**
 * Hook for fetching a single transaction by ID
 * SECURITY: Always filters by current workspace ID
 */
export function useTransaction(id: string) {
  const { currentWorkspace } = useWorkspace()
  
  return useQuery({
    queryKey: ['transaction', currentWorkspace?.id, id],
    queryFn: async (): Promise<TransactionWithCategory | null> => {
      // SECURITY: Must have a current workspace
      if (!currentWorkspace?.id) {
        return null
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('id', id)
        .eq('workspace_id', currentWorkspace.id) // CRITICAL: Filter by workspace
        .single()

      if (error) {
        throw new Error(`Failed to fetch transaction: ${error.message}`)
      }

      return data
    },
    enabled: !!id && !!currentWorkspace?.id, // Only run when both ID and workspace are available
  })
}

/**
 * Hook for creating transactions with optimistic updates
 * SECURITY: Invalidates queries for current workspace only
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation<ActionResult<Transaction>, Error, FormData>({
    mutationFn: createTransaction,
    onSuccess: () => {
      // Invalidate and refetch queries after successful creation
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      // Invalidate reconciliation status to update balances
      queryClient.invalidateQueries({ queryKey: ['reconciliation', 'status', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['account-difference'] })
      // Invalidate dashboard widget queries
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account-balances'] })
      queryClient.invalidateQueries({ queryKey: ['spending-trends'] })
    },
  })
}

/**
 * Hook for updating transactions with optimistic updates
 * SECURITY: Invalidates queries for current workspace only
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation<ActionResult<Transaction>, Error, { id: string; formData: FormData }>({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      updateTransaction(id, formData),
    onSuccess: () => {
      // Invalidate and refetch queries after successful update
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      // Invalidate reconciliation status to update balances
      queryClient.invalidateQueries({ queryKey: ['reconciliation', 'status', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['account-difference'] })
      // Invalidate dashboard widget queries
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account-balances'] })
      queryClient.invalidateQueries({ queryKey: ['spending-trends'] })
    },
  })
}

/**
 * Hook for deleting transactions with optimistic updates
 * SECURITY: Invalidates queries for current workspace only
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation<ActionResult<{ id: string }>, Error, string>({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      // Invalidate and refetch queries after successful deletion
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      // Invalidate reconciliation status to update balances
      queryClient.invalidateQueries({ queryKey: ['reconciliation', 'status', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['account-difference'] })
      // Invalidate dashboard widget queries
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account-balances'] })
      queryClient.invalidateQueries({ queryKey: ['spending-trends'] })
    },
  })
}

/**
 * Hook for marking planned transactions as completed
 * Implements Requirements 3.4: Mark planned transactions as completed
 * SECURITY: Invalidates queries for current workspace only
 */
export function useMarkPlannedAsCompleted() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation<ActionResult<Transaction>, Error, string>({
    mutationFn: async (transactionId: string) => {
      const { markPlannedAsCompleted } = await import('@/actions/transactions')
      return markPlannedAsCompleted(transactionId)
    },
    onSuccess: () => {
      // Invalidate and refetch queries after marking as completed
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      // Invalidate reconciliation status to update balances
      queryClient.invalidateQueries({ queryKey: ['reconciliation', 'status', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['account-difference'] })
      // Invalidate dashboard widget queries
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account-balances'] })
      queryClient.invalidateQueries({ queryKey: ['spending-trends'] })
    },
  })
}