import { useState, useEffect, useCallback } from 'react'
import { getTransactionTypes } from '@/actions/transaction-types'
import type { TransactionType, TransactionTypeFamily } from '@/lib/validations/transaction-type'

interface UseTransactionTypesOptions {
  workspaceId?: string
  family?: TransactionTypeFamily
  autoLoad?: boolean
}

interface UseTransactionTypesReturn {
  transactionTypes: TransactionType[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  getTypesByFamily: (family: TransactionTypeFamily) => TransactionType[]
  getDefaultType: (family: TransactionTypeFamily) => TransactionType | undefined
  getTypeById: (id: string) => TransactionType | undefined
}

/**
 * Hook for managing transaction types
 * Implements Requirements 8.1, 8.2: Custom transaction type system accessible from Transactions section
 */
export function useTransactionTypes({
  workspaceId,
  family,
  autoLoad = true
}: UseTransactionTypesOptions = {}): UseTransactionTypesReturn {
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch transaction types
  const fetchTransactionTypes = useCallback(async () => {
    if (!workspaceId && !autoLoad) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getTransactionTypes(workspaceId, family)
      
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Validation error')
        setTransactionTypes([])
      } else {
        setTransactionTypes(result.data || [])
      }
    } catch (err) {
      setError('Failed to fetch transaction types')
      setTransactionTypes([])
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, family, autoLoad])

  // Auto-load on mount and when dependencies change
  useEffect(() => {
    if (autoLoad) {
      fetchTransactionTypes()
    }
  }, [fetchTransactionTypes, autoLoad])

  // Get transaction types by family
  const getTypesByFamily = useCallback((targetFamily: TransactionTypeFamily) => {
    return transactionTypes.filter(type => type.family === targetFamily)
  }, [transactionTypes])

  // Get default transaction type for a family
  const getDefaultType = useCallback((targetFamily: TransactionTypeFamily) => {
    return transactionTypes.find(type => 
      type.family === targetFamily && type.is_default
    )
  }, [transactionTypes])

  // Get transaction type by ID
  const getTypeById = useCallback((id: string) => {
    return transactionTypes.find(type => type.id === id)
  }, [transactionTypes])

  return {
    transactionTypes,
    isLoading,
    error,
    refetch: fetchTransactionTypes,
    getTypesByFamily,
    getDefaultType,
    getTypeById,
  }
}