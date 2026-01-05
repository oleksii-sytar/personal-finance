import { LoadingSpinner } from './loading-spinner'

interface FullScreenLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Full-screen loading component with proper centering and visibility
 * Use this for page-level loading states to avoid positioning issues
 */
export function FullScreenLoading({ 
  message = 'Loading...', 
  size = 'lg' 
}: FullScreenLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        <LoadingSpinner size={size} centered />
        {message && (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}