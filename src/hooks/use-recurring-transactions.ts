import { useState, useEffect } from 'react'
import { 
  getRecurringTransactions, 
  getExpectedTransactions 
} from '@/actions/recurring-transactions'
import type { RecurringTransaction, ExpectedTransaction } from '@/types'

interface UseRecurringTransactionsResult {
  recurringTransactions: RecurringTransaction[]
  expectedTransactions: ExpectedTransaction[]
  pendingExpectedTransactions: ExpectedTransaction[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to manage recurring transactions and expected transactions
 * Provides data and loading states for recurring transaction components
 */
export function useRecurringTransactions(workspaceId: string): UseRecurringTransactionsResult {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [expectedTransactions, setExpectedTransactions] = useState<ExpectedTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch both recurring and expected transactions in parallel
      const [recurringResult, expectedResult] = await Promise.all([
        getRecurringTransactions(workspaceId),
        getExpectedTransactions(workspaceId)
      ])

      if (recurringResult.error) {
        throw new Error(typeof recurringResult.error === 'string' 
          ? recurringResult.error 
          : 'Failed to fetch recurring transactions'
        )
      }

      if (expectedResult.error) {
        throw new Error(typeof expectedResult.error === 'string' 
          ? expectedResult.error 
          : 'Failed to fetch expected transactions'
        )
      }

      setRecurringTransactions(recurringResult.data || [])
      setExpectedTransactions(expectedResult.data || [])
    } catch (err) {
      console.error('Error fetching recurring transactions:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (workspaceId) {
      fetchData()
    }
  }, [workspaceId])

  // Filter pending expected transactions
  const pendingExpectedTransactions = expectedTransactions.filter(
    et => et.status === 'pending'
  )

  return {
    recurringTransactions,
    expectedTransactions,
    pendingExpectedTransactions,
    isLoading,
    error,
    refetch: fetchData,
  }
}