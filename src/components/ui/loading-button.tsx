import { forwardRef } from 'react'
import { Button, type ButtonProps } from './Button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { cn } from '@/lib/utils'

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
}

/**
 * Button component with loading state
 * Automatically disables and shows spinner when loading
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'relative',
          loading && 'cursor-not-allowed',
          className
        )}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner size="sm" className="mr-2" />
            {loadingText && (
              <span className="text-sm">{loadingText}</span>
            )}
          </div>
        )}
        <span className={cn(loading && 'opacity-0')}>
          {children}
        </span>
      </Button>
    )
  }
)

LoadingButton.displayName = 'LoadingButton'