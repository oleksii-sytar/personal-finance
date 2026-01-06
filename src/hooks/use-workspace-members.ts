import { useQuery } from '@tanstack/react-query'
import supabase from '@/lib/supabase/client'
import { useWorkspace } from '@/contexts/workspace-context'

interface WorkspaceMember {
  user_id: string
  role: 'owner' | 'member'
  user_profiles: {
    full_name?: string
  } | null
}

/**
 * Hook for fetching workspace members
 * Used for filtering transactions by member
 */
export function useWorkspaceMembers() {
  const { currentWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      if (!currentWorkspace?.id) {
        return []
      }

      // First get workspace members
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', currentWorkspace.id)

      if (membersError) {
        throw new Error(`Failed to fetch workspace members: ${membersError.message}`)
      }

      if (!membersData || membersData.length === 0) {
        return []
      }

      // Then get user profiles for those members
      const userIds = membersData.map(member => member.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds)

      if (profilesError) {
        console.warn('Failed to fetch user profiles:', profilesError.message)
        // Return members without profile data
        return membersData.map(member => ({
          user_id: member.user_id,
          role: member.role,
          user_profiles: null
        }))
      }

      // Combine the data
      const transformedData = membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id)
        return {
          user_id: member.user_id,
          role: member.role,
          user_profiles: profile ? { full_name: profile.full_name } : null
        }
      })

      return transformedData
    },
    enabled: !!currentWorkspace?.id,
  })
}