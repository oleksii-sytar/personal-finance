/**
 * React Query hook for account difference
 * 
 * Provides real-time account difference with automatic cache invalidation
 * when balances or transactions change for that specific account.
 * 
 * Requirements:
 * - 7.1: Real-time updates when transactions created
 * - 7.2: Real-time updates when transactions edited
 * - 7.3: Real-time updates when transactions deleted
 * - 7.4: Real-time updates when current balance updated
 */

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAccountDifference, type AccountBalance } from '@/actions/balance-reconciliation'

/**
 * Query key factory for account difference
 * Allows for easy cache invalidation and management
 */
export const accountDifferenceKeys = {
  all: ['account-difference'] as const,
  account: (accountId: string) => ['account-difference', accountId] as const,
}

/**
 * Hook options for useAccountDifference
 */
export interface UseAccountDifferenceOptions {
  /**
   * Account ID to fetch difference for
   */
  accountId: string
  
  /**
   * Enable/disable the query
   * @default true
   */
  enabled?: boolean
  
  /**
   * Stale time in milliseconds
   * @default 30000 (30 seconds)
   */
  staleTime?: number
  
  /**
   * Refetch on window focus
   * @default true
   */
  refetchOnWindowFocus?: boolean
  
  /**
   * Refetch interval in milliseconds
   * @default false (no automatic refetch)
   */
  refetchInterval?: number | false
}

/**
 * Custom hook for fetching and managing account difference
 * 
 * Features:
 * - Automatic caching with React Query
 * - Configurable stale time and refetch behavior
 * - Cache invalidation on balance updates and transaction changes
 * - Type-safe error handling
 * 
 * @param options - Hook configuration options
 * @returns React Query result with account difference
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useAccountDifference({
 *   accountId: 'account-id'
 * })
 * 
 * if (isLoading) return <Spinner />
 * if (error) return <Error message={error} />
 * 
 * return <AccountDifference data={data} />
 * ```
 */
export function useAccountDifference({
  accountId,
  enabled = true,
  staleTime = 30000, // 30 seconds
  refetchOnWindowFocus = true,
  refetchInterval = false,
}: UseAccountDifferenceOptions) {
  return useQuery({
    queryKey: accountDifferenceKeys.account(accountId),
    queryFn: async (): Promise<AccountBalance> => {
      const result = await getAccountDifference(accountId)
      
      if (result.error) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Failed to fetch account difference')
      }
      
      if (!result.data) {
        throw new Error('No data returned from account difference')
      }
      
      return result.data
    },
    enabled: enabled && !!accountId,
    staleTime,
    refetchOnWindowFocus,
    refetchInterval,
    // Retry failed requests with exponential backoff
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook to invalidate account difference cache
 * 
 * Use this after operations that change balances or transactions for a specific account:
 * - updateCurrentBalance (for that account)
 * - createTransaction (for that account)
 * - updateTransaction (for that account)
 * - deleteTransaction (for that account)
 * 
 * @returns Function to invalidate account difference cache
 * 
 * @example
 * ```tsx
 * const invalidateAccountDifference = useInvalidateAccountDifference()
 * 
 * const handleBalanceUpdate = async () => {
 *   await updateCurrentBalance(accountId, newBalance)
 *   invalidateAccountDifference(accountId)
 * }
 * ```
 */
export function useInvalidateAccountDifference() {
  const queryClient = useQueryClient()
  
  return (accountId: string) => {
    queryClient.invalidateQueries({
      queryKey: accountDifferenceKeys.account(accountId),
    })
  }
}

/**
 * Hook to manually refetch account difference
 * 
 * @returns Function to refetch account difference
 * 
 * @example
 * ```tsx
 * const refetchAccountDifference = useRefetchAccountDifference()
 * 
 * const handleRefresh = () => {
 *   refetchAccountDifference(accountId)
 * }
 * ```
 */
export function useRefetchAccountDifference() {
  const queryClient = useQueryClient()
  
  return (accountId: string) => {
    queryClient.refetchQueries({
      queryKey: accountDifferenceKeys.account(accountId),
    })
  }
}
