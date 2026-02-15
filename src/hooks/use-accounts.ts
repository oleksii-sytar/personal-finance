/**
 * useAccounts Hook
 * 
 * React Query hook for fetching accounts data.
 * Provides loading states, error handling, and automatic refetching.
 */

import { useQuery } from '@tanstack/react-query'
import { getAccounts } from '@/actions/accounts'
import type { Account } from '@/types'

/**
 * Hook to fetch all accounts for the current workspace
 * 
 * @returns React Query result with accounts data
 */
export function useAccounts() {
  return useQuery<Account[], Error>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const result = await getAccounts()
      
      if (result.error) {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : 'Failed to fetch accounts'
        throw new Error(errorMessage)
      }
      
      return result.data || []
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache at all
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always refetch when component mounts
  })
}
