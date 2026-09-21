import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options?: SelectOption[]
}

/** Native select styled to match the design system — reliable and accessible. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, children, id, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id || generatedId
    const errorId = error ? `${selectId}-error` : undefined
    return (
      <div className="min-w-0 space-y-2">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            aria-describedby={errorId}
            className={cn(
              'form-input min-w-0 max-w-full w-full appearance-none pr-10',
              error && 'border-[var(--accent-error)]/50',
              className
            )}
            {...props}
          >
            {options
              ? options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
        {error && (
          <p id={errorId} className="text-sm text-[var(--accent-error)]">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'