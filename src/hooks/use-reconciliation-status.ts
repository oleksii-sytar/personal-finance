/**
 * React Query hook for reconciliation status
 * 
 * Provides real-time reconciliation status with automatic cache invalidation
 * when balances or transactions change.
 * 
 * Requirements:
 * - 7.5: Real-time UI updates without page refresh
 * - 10.1: React Query integration for reconciliation status
 */

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getReconciliationStatus, type ReconciliationStatus } from '@/actions/balance-reconciliation'
import type { ActionResult } from '@/types'

/**
 * Query key factory for reconciliation status
 * Allows for easy cache invalidation and management
 */
export const reconciliationKeys = {
  all: ['reconciliation'] as const,
  status: (workspaceId: string) => ['reconciliation', 'status', workspaceId] as const,
}

/**
 * Hook options for useReconciliationStatus
 */
export interface UseReconciliationStatusOptions {
  /**
   * Workspace ID to fetch reconciliation status for
   */
  workspaceId: string
  
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
 * Custom hook for fetching and managing reconciliation status
 * 
 * Features:
 * - Automatic caching with React Query
 * - Configurable stale time and refetch behavior
 * - Cache invalidation on balance updates and transaction changes
 * - Type-safe error handling
 * 
 * @param options - Hook configuration options
 * @returns React Query result with reconciliation status
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useReconciliationStatus({
 *   workspaceId: 'workspace-id'
 * })
 * 
 * if (isLoading) return <Spinner />
 * if (error) return <Error message={error} />
 * 
 * return <ReconciliationStatus data={data} />
 * ```
 */
export function useReconciliationStatus({
  workspaceId,
  enabled = true,
  staleTime = 30000, // 30 seconds
  refetchOnWindowFocus = true,
  refetchInterval = false,
}: UseReconciliationStatusOptions) {
  return useQuery({
    queryKey: reconciliationKeys.status(workspaceId),
    queryFn: async (): Promise<ReconciliationStatus> => {
      const result = await getReconciliationStatus(workspaceId)
      
      if (result.error) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Failed to fetch reconciliation status')
      }
      
      if (!result.data) {
        throw new Error('No data returned from reconciliation status')
      }
      
      return result.data
    },
    enabled: enabled && !!workspaceId,
    staleTime,
    refetchOnWindowFocus,
    refetchInterval,
    // Retry failed requests with exponential backoff
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook to invalidate reconciliation status cache
 * 
 * Use this after operations that change balances or transactions:
 * - updateCurrentBalance
 * - createTransaction
 * - updateTransaction
 * - deleteTransaction
 * 
 * @returns Function to invalidate reconciliation cache
 * 
 * @example
 * ```tsx
 * const invalidateReconciliation = useInvalidateReconciliation()
 * 
 * const handleBalanceUpdate = async () => {
 *   await updateCurrentBalance(accountId, newBalance)
 *   invalidateReconciliation(workspaceId)
 * }
 * ```
 */
export function useInvalidateReconciliation() {
  const queryClient = useQueryClient()
  
  return (workspaceId: string) => {
    queryClient.invalidateQueries({
      queryKey: reconciliationKeys.status(workspaceId),
    })
  }
}

/**
 * Hook to manually refetch reconciliation status
 * 
 * @returns Function to refetch reconciliation status
 * 
 * @example
 * ```tsx
 * const refetchReconciliation = useRefetchReconciliation()
 * 
 * const handleRefresh = () => {
 *   refetchReconciliation(workspaceId)
 * }
 * ```
 */
export function useRefetchReconciliation() {
  const queryClient = useQueryClient()
  
  return (workspaceId: string) => {
    queryClient.refetchQueries({
      queryKey: reconciliationKeys.status(workspaceId),
    })
  }
}
