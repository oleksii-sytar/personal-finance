import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  centered?: boolean
}

/**
 * Loading spinner component following design-system.md patterns
 * Enhanced with better visibility and centering options
 */
export function LoadingSpinner({ 
  size = 'md', 
  className,
  centered = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-2',
        // Enhanced visibility for both themes
        'border-muted/30 border-t-accent',
        // Add subtle shadow for better visibility in light mode
        'drop-shadow-sm',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )

  // If centered, wrap in a centering container
  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        {spinner}
      </div>
    )
  }

  return spinner
}