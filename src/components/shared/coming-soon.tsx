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
        <div className="mb-4 text-[var(--text-secondary)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md">
        {description}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span className="px-3 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-xs font-medium">
          Coming Soon
        </span>
        {availableIn && (
          <span className="px-3 py-1 bg-[var(--bg-glass)] border border-[var(--glass-border)] rounded-full text-xs text-[var(--text-secondary)]">
            {availableIn}
          </span>
        )}
      </div>
    </div>
  )
}