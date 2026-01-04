/**
 * Loading skeleton for authentication forms
 * Provides consistent loading experience while lazy components load
 * Requirements: 4.1, 4.4, 4.5
 */

interface FormLoadingSkeletonProps {
  variant?: 'login' | 'register' | 'reset' | 'verify' | 'workspace'
}

export function FormLoadingSkeleton({ variant = 'login' }: FormLoadingSkeletonProps) {
  const getSkeletonElements = () => {
    switch (variant) {
      case 'register':
        return (
          <>
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
            <div className="h-4 bg-glass/50 rounded animate-pulse" />
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
          </>
        )
      case 'reset':
        return (
          <>
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
            <div className="h-4 bg-glass/50 rounded animate-pulse" />
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
          </>
        )
      case 'verify':
        return (
          <>
            <div className="h-16 bg-glass rounded-xl animate-pulse" />
            <div className="h-4 bg-glass/50 rounded animate-pulse" />
            <div className="h-4 bg-glass/50 rounded animate-pulse" />
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
          </>
        )
      case 'workspace':
        return (
          <>
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
            <div className="h-24 bg-glass rounded-xl animate-pulse" />
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
          </>
        )
      default: // login
        return (
          <>
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
            <div className="h-4 bg-glass/50 rounded animate-pulse" />
            <div className="h-12 bg-glass rounded-xl animate-pulse" />
          </>
        )
    }
  }

  return (
    <div className="space-y-4">
      {getSkeletonElements()}
    </div>
  )
}