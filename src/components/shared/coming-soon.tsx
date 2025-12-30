import type { ReactNode } from 'react'

interface ComingSoonProps {
  title: string
  description?: string
  icon?: ReactNode
  availableIn?: string
}

/**
 * Component for features that are not yet implemented
 * Following feature-flags.md graceful degradation patterns
 */
export function ComingSoon({ 
  title, 
  description = 'This feature is coming in a future update.',
  icon,
  availableIn
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && (
        <div className="mb-4 text-text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-muted heading-primary">
        {title}
      </h3>
      <p className="text-sm text-text-muted mt-2 body-text">
        {description}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span className="px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-xs font-medium">
          Coming Soon
        </span>
        {availableIn && (
          <span className="px-3 py-1 bg-background-glass border border-border-glass rounded-full text-xs text-text-secondary">
            {availableIn}
          </span>
        )}
      </div>
    </div>
  )
}