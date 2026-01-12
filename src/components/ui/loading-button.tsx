import { forwardRef, useState, useEffect } from 'react'
import { Button, type ButtonProps } from './Button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { cn } from '@/lib/utils'

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
  minLoadingTime?: number // Minimum time to show loading state (prevents flicker)
}

/**
 * Button component with loading state
 * Automatically disables and shows spinner when loading
 * Includes anti-flicker logic for fast requests
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ 
    loading = false, 
    loadingText, 
    children, 
    disabled, 
    className, 
    minLoadingTime = 500, // 500ms minimum loading time to prevent flicker
    ...props 
  }, ref) => {
    const [showLoading, setShowLoading] = useState(false)
    const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null)

    useEffect(() => {
      if (loading) {
        // Start loading immediately
        setShowLoading(true)
        setLoadingStartTime(Date.now())
      } else if (loadingStartTime) {
        // Calculate how long loading has been shown
        const elapsed = Date.now() - loadingStartTime
        const remaining = Math.max(0, minLoadingTime - elapsed)
        
        // If we haven't shown loading long enough, delay hiding it
        if (remaining > 0) {
          const timeout = setTimeout(() => {
            setShowLoading(false)
            setLoadingStartTime(null)
          }, remaining)
          
          return () => clearTimeout(timeout)
        } else {
          // Enough time has passed, hide immediately
          setShowLoading(false)
          setLoadingStartTime(null)
        }
      }
    }, [loading, loadingStartTime, minLoadingTime])

    return (
      <Button
        ref={ref}
        disabled={disabled || showLoading}
        className={cn(
          'relative transition-all duration-200',
          showLoading && 'cursor-not-allowed',
          className
        )}
        {...props}
      >
        {showLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-inherit">
            <LoadingSpinner size="sm" className="mr-2" />
            {loadingText && (
              <span className="text-sm">{loadingText}</span>
            )}
          </div>
        )}
        <span className={cn(
          'transition-opacity duration-200',
          showLoading && 'opacity-0'
        )}>
          {children}
        </span>
      </Button>
    )
  }
)

LoadingButton.displayName = 'LoadingButton'