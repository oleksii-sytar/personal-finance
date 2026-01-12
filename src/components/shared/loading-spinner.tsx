import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  centered?: boolean
}

/**
 * Loading spinner component following design-system.md patterns
 * Enhanced with smooth animations and anti-flicker behavior
 */
export function LoadingSpinner({ 
  size = 'md', 
  className,
  centered = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
  }

  const spinner = (
    <div
      className={cn(
        // Smooth spin animation with consistent timing
        'animate-spin rounded-full',
        // Enhanced visibility for both themes with better contrast
        'border-[var(--text-muted)]/20 border-t-[var(--accent-primary)]',
        // Smooth appearance with fade-in
        'animate-in fade-in duration-200',
        // Add subtle shadow for better visibility
        'drop-shadow-sm',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
      style={{
        // Ensure consistent animation timing
        animationDuration: '1s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite'
      }}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )

  // If centered, wrap in a centering container
  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[200px] animate-in fade-in duration-300">
        {spinner}
      </div>
    )
  }

  return spinner
}