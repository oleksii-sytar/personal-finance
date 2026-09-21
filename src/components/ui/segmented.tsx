'use client'

import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  count?: number
  icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  'aria-label'?: string
}

/** Pill-style segmented control for filters and income/expense toggles. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('segmented-control inline-flex min-w-0 max-w-full flex-nowrap items-stretch gap-1 rounded-pill border border-glass bg-glass p-1', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            aria-label={opt.count!=null?opt.label+' '+opt.count:opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'segmented-option inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-pill px-2 py-2 text-sm font-medium transition-all',
              active
                ? 'bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-[0_2px_12px_-4px_var(--shadow-primary)]'
                : 'text-secondary hover:text-primary'
            )}
          >
            {opt.icon}
            <span className="segmented-label">{opt.label}</span>
            {opt.count != null && <span className="segmented-count">{opt.count}</span>}
          </button>
        )
      })}
    </div>
  )
}