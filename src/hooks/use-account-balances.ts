/**
 * useAccountBalances Hook
 * 
 * React Query hook for fetching account balances with reconciliation status.
 * Provides loading states, error handling, and automatic refetching.
 */

import { useQuery } from '@tanstack/react-query'
import { useWorkspace } from '@/contexts/workspace-context'
import { getReconciliationStatus, type AccountBalance } from '@/actions/balance-reconciliation'

/**
 * Hook to fetch account balances with reconciliation status
 * 
 * @returns React Query result with account balances data
 */
export function useAccountBalances() {
  const { currentWorkspace } = useWorkspace()
  
  return useQuery<AccountBalance[], Error>({
    queryKey: ['account-balances', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) {
        return []
      }
      
      const result = await getReconciliationStatus(currentWorkspace.id)
      
      if (result.error) {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : 'Failed to fetch account balances'
        throw new Error(errorMessage)
      }
      
      return result.data?.accounts || []
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache at all
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always refetch when component mounts
  })
}
