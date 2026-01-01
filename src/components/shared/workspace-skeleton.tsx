import { Skeleton, CardSkeleton, ListItemSkeleton } from '@/components/ui/skeleton'

/**
 * Skeleton components for workspace-related loading states
 */

export function WorkspaceListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <CardSkeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

export function WorkspaceMembersSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  )
}

export function WorkspaceSettingsSkeleton() {
  return (
    <div className="glass-card space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-12 w-32 rounded-full" />
          <Skeleton className="h-12 w-24 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function WorkspaceInvitationsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}