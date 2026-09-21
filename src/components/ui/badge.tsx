import { cn } from '@/lib/utils'

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'outline'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-glass text-secondary border border-glass',
  accent: 'text-[var(--accent-primary)] border border-[var(--border-accent)] bg-[var(--ambient-glow)]',
  success: 'text-[var(--accent-success)] border border-[color-mix(in_srgb,var(--accent-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-success)_12%,transparent)]',
  warning: 'text-[var(--accent-warning)] border border-[color-mix(in_srgb,var(--accent-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-warning)_12%,transparent)]',
  error: 'text-[var(--accent-error)] border border-[color-mix(in_srgb,var(--accent-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-error)_12%,transparent)]',
  info: 'text-[var(--accent-info)] border border-[color-mix(in_srgb,var(--accent-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-info)_12%,transparent)]',
  outline: 'text-secondary border border-primary',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium leading-5',
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}