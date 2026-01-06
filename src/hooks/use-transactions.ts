import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import supabase from '@/lib/supabase/client'
import { createTransaction, updateTransaction, deleteTransaction } from '@/actions/transactions'
import { useWorkspace } from '@/contexts/workspace-context'
import type { Transaction, TransactionWithCategory, TransactionFilters } from '@/types'

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

  return useMutation({
    mutationFn: createTransaction,
    onMutate: async (formData) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      await queryClient.cancelQueries({ queryKey: ['transactions-infinite', currentWorkspace?.id] })

      // Snapshot the previous value
      const previousTransactions = queryClient.getQueryData(['transactions', currentWorkspace?.id])
      const previousInfiniteTransactions = queryClient.getQueryData(['transactions-infinite', currentWorkspace?.id])

      // Optimistically update to the new value
      const optimisticTransaction = {
        id: `temp-${Date.now()}`, // Temporary ID
        workspace_id: currentWorkspace?.id || '',
        user_id: 'temp-user',
        amount: Number(formData.get('amount')),
        currency: formData.get('currency') as string || 'UAH',
        type: formData.get('type') as 'income' | 'expense',
        category_id: formData.get('category_id') as string || null,
        description: formData.get('description') as string,
        notes: formData.get('notes') as string || null,
        transaction_date: formData.get('transaction_date') as string,
        is_expected: false,
        expected_transaction_id: null,
        recurring_transaction_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'temp-user',
        updated_by: null,
        original_amount: null,
        original_currency: null,
        transaction_type_id: null,
        deleted_at: null,
        category: null, // Will be populated by server response
      }

      // Add optimistic transaction to the cache
      queryClient.setQueryData(['transactions', currentWorkspace?.id], (old: any) => {
        if (!old) return [optimisticTransaction]
        return [optimisticTransaction, ...old]
      })

      // Return a context object with the snapshotted value
      return { previousTransactions, previousInfiniteTransactions, optimisticTransaction }
    },
    onError: (err, formData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions', currentWorkspace?.id], context.previousTransactions)
      }
      if (context?.previousInfiniteTransactions) {
        queryClient.setQueryData(['transactions-infinite', currentWorkspace?.id], context.previousInfiniteTransactions)
      }
    },
    onSuccess: (result, formData, context) => {
      // Replace the optimistic transaction with the real one
      if (result.data && context?.optimisticTransaction) {
        queryClient.setQueryData(['transactions', currentWorkspace?.id], (old: any) => {
          if (!old) return [result.data]
          return old.map((t: any) => 
            t.id === context.optimisticTransaction.id ? result.data : t
          )
        })
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
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

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      updateTransaction(id, formData),
    onMutate: async ({ id, formData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      await queryClient.cancelQueries({ queryKey: ['transaction', currentWorkspace?.id, id] })

      // Snapshot the previous values
      const previousTransactions = queryClient.getQueryData(['transactions', currentWorkspace?.id])
      const previousTransaction = queryClient.getQueryData(['transaction', currentWorkspace?.id, id])

      // Optimistically update the transaction
      const updatedFields = {
        amount: formData.get('amount') ? Number(formData.get('amount')) : undefined,
        type: formData.get('type') as 'income' | 'expense' | undefined,
        category_id: formData.get('category_id') as string | undefined,
        description: formData.get('description') as string | undefined,
        notes: formData.get('notes') as string | undefined,
        transaction_date: formData.get('transaction_date') as string | undefined,
        currency: formData.get('currency') as string | undefined,
        updated_at: new Date().toISOString(),
      }

      // Update in transactions list
      queryClient.setQueryData(['transactions', currentWorkspace?.id], (old: any) => {
        if (!old) return []
        return old.map((t: any) => 
          t.id === id ? { ...t, ...updatedFields } : t
        )
      })

      // Update single transaction query
      queryClient.setQueryData(['transaction', currentWorkspace?.id, id], (old: any) => {
        if (!old) return old
        return { ...old, ...updatedFields }
      })

      return { previousTransactions, previousTransaction, id }
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions', currentWorkspace?.id], context.previousTransactions)
      }
      if (context?.previousTransaction) {
        queryClient.setQueryData(['transaction', currentWorkspace?.id, id], context.previousTransaction)
      }
    },
    onSuccess: (result, { id }) => {
      // Replace optimistic update with real data
      if (result.data) {
        queryClient.setQueryData(['transactions', currentWorkspace?.id], (old: any) => {
          if (!old) return []
          return old.map((t: any) => 
            t.id === id ? result.data : t
          )
        })
        queryClient.setQueryData(['transaction', currentWorkspace?.id, id], result.data)
      }
    },
    onSettled: (_result, _error, { id }) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['transaction', currentWorkspace?.id, id] })
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

  return useMutation({
    mutationFn: deleteTransaction,
    onMutate: async (transactionId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      await queryClient.cancelQueries({ queryKey: ['transactions-infinite', currentWorkspace?.id] })

      // Snapshot the previous value
      const previousTransactions = queryClient.getQueryData(['transactions', currentWorkspace?.id])
      const previousInfiniteTransactions = queryClient.getQueryData(['transactions-infinite', currentWorkspace?.id])

      // Optimistically remove the transaction
      queryClient.setQueryData(['transactions', currentWorkspace?.id], (old: any) => {
        if (!old) return []
        return old.filter((t: any) => t.id !== transactionId)
      })

      // Return context for rollback
      return { previousTransactions, previousInfiniteTransactions, deletedId: transactionId }
    },
    onError: (err, transactionId, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions', currentWorkspace?.id], context.previousTransactions)
      }
      if (context?.previousInfiniteTransactions) {
        queryClient.setQueryData(['transactions-infinite', currentWorkspace?.id], context.previousInfiniteTransactions)
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}