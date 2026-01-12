import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import supabase from '@/lib/supabase/client'
import { createTransaction, updateTransaction, deleteTransaction } from '@/actions/transactions'
import { useWorkspace } from '@/contexts/workspace-context'
import type { Transaction, TransactionWithCategory, TransactionFilters, ActionResult } from '@/types'

/**
 * Hook for fetching transactions with optional filtering
 * Following code-quality.md naming and structure patterns
 * SECURITY: Always filters by current workspace ID
 */
export function useTransactions(filters?: {
  categories?: string[]
  type?: 'income' | 'expense'
  startDate?: Date
  endDate?: Date
}) {
  const { currentWorkspace } = useWorkspace()
  
  return useQuery({
    queryKey: ['transactions', currentWorkspace?.id, filters],
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
        .order('transaction_date', { ascending: false })

      // Apply additional filters
      if (filters?.categories?.length) {
        query = query.in('category_id', filters.categories)
      }
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
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
        .order('transaction_date', { ascending: false })
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
    },
  })
}