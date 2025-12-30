import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import supabase from '@/lib/supabase/client'
import { createTransaction, updateTransaction, deleteTransaction } from '@/actions/transactions'
import type { Transaction, FullTransaction } from '@/types'

/**
 * Hook for fetching transactions with optional filtering
 * Following code-quality.md naming and structure patterns
 */
export function useTransactions(filters?: {
  accountId?: string
  categoryId?: string
  type?: 'income' | 'expense' | 'transfer'
  startDate?: Date
  endDate?: Date
}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async (): Promise<FullTransaction[]> => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          account:accounts(*)
        `)
        .order('transaction_date', { ascending: false })

      // Apply filters
      if (filters?.accountId) {
        query = query.eq('account_id', filters.accountId)
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate.toISOString())
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`)
      }

      return data || []
    },
  })
}

/**
 * Hook for fetching a single transaction by ID
 */
export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async (): Promise<FullTransaction | null> => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          account:accounts(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(`Failed to fetch transaction: ${error.message}`)
      }

      return data
    },
    enabled: !!id,
  })
}

/**
 * Hook for creating transactions with optimistic updates
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      // Invalidate and refetch transactions
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * Hook for updating transactions with optimistic updates
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      updateTransaction(id, formData),
    onSuccess: (_result, { id }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transaction', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * Hook for deleting transactions
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}