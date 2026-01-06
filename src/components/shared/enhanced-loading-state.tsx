/**
 * Enhanced loading state component with multiple variants
 * Provides consistent loading experience across the application
 */

'use client'

import { Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedLoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'pulse' | 'shimmer'
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
  fullScreen?: boolean
  overlay?: boolean
}

export function EnhancedLoadingState({
  variant = 'spinner',
  size = 'md',
  message,
  className,
  fullScreen = false,
  overlay = false
}: EnhancedLoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const containerClasses = cn(
    'flex flex-col items-center justify-center',
    fullScreen && 'fixed inset-0 z-50',
    overlay && 'bg-black/20 backdrop-blur-sm',
    !fullScreen && 'p-8',
    className
  )

  if (variant === 'spinner') {
    return (
      <div className={containerClasses}>
        <Loader2Icon className={cn(
          'animate-spin text-[var(--accent-primary)]',
          sizeClasses[size]
        )} />
        {message && (
          <p className="mt-3 text-sm text-secondary animate-pulse">
            {message}
          </p>
        )}
      </div>
    )
  }

  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-glass border border-glass rounded-xl p-4 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-secondary/20 rounded w-1/3"></div>
              <div className="h-4 bg-secondary/20 rounded w-1/4"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 bg-secondary/20 rounded w-1/4"></div>
              <div className="h-3 bg-secondary/20 rounded w-1/6"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={containerClasses}>
        <div className={cn(
          'rounded-full bg-[var(--accent-primary)] animate-pulse',
          sizeClasses[size]
        )} />
        {message && (
          <p className="mt-3 text-sm text-secondary">
            {message}
          </p>
        )}
      </div>
    )
  }

  if (variant === 'shimmer') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-glass border border-glass rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-secondary/20 rounded w-1/3 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <div className="h-4 bg-secondary/20 rounded w-1/4 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 bg-secondary/20 rounded w-1/4 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <div className="h-3 bg-secondary/20 rounded w-1/6 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

// Shimmer animation keyframes (add to global CSS)
export const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
`