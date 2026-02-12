/**
 * AccountsLoadingSkeleton - Loading State for Accounts Page
 * 
 * Displays skeleton placeholders while accounts data is being fetched.
 * Maintains Executive Lounge aesthetic with glass effects.
 */

import { cn } from '@/lib/utils'

/**
 * AccountsLoadingSkeleton component
 * 
 * Shows:
 * - Summary skeleton at top
 * - Grid of account card skeletons
 * - Maintains responsive layout (1 col mobile, 2 col tablet, 3 col desktop)
 */
export function AccountsLoadingSkeleton() {
  return (
    <div className="container py-6 space-y-6">
      {/* Summary Skeleton */}
      <div
        className={cn(
          'bg-glass backdrop-blur-[16px]',
          'border border-glass',
          'rounded-[20px]',
          'p-6',
          'animate-pulse'
        )}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Total Balance Label */}
            <div className="h-4 w-24 bg-glass rounded" />
            
            {/* Total Balance Amount */}
            <div className="h-10 w-48 bg-glass rounded" />
            
            {/* Account Type Summary */}
            <div className="h-4 w-64 bg-glass rounded" />
          </div>
          
          {/* Add Button Skeleton */}
          <div className="h-12 w-12 bg-glass rounded-full" />
        </div>
      </div>
      
      {/* Account Cards Grid Skeleton */}
      <div 
        className={cn(
          'grid gap-4',
          'grid-cols-1',
          'md:grid-cols-2',
          'lg:grid-cols-3'
        )}
      >
        {/* Show 3 skeleton cards */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'bg-glass backdrop-blur-[16px]',
              'border border-glass',
              'rounded-[20px]',
              'p-6',
              'animate-pulse',
              'space-y-4'
            )}
          >
            {/* Icon and Actions */}
            <div className="flex items-start justify-between">
              <div className="h-8 w-8 bg-glass rounded-full" />
              <div className="flex gap-2">
                <div className="h-9 w-9 bg-glass rounded" />
                <div className="h-9 w-9 bg-glass rounded" />
              </div>
            </div>
            
            {/* Account Name */}
            <div className="h-6 w-32 bg-glass rounded" />
            
            {/* Balance */}
            <div className="h-9 w-40 bg-glass rounded" />
            
            {/* Type Badge */}
            <div className="h-6 w-28 bg-glass rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
