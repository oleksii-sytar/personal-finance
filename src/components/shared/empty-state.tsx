import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/** Friendly empty / first-run state used across feature screens. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('glass-card flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-glass bg-[var(--ambient-glow)] text-[var(--accent-primary)]">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="font-space-grotesk text-lg font-semibold text-primary">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}