import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id || generatedId
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <textarea
          id={fieldId}
          ref={ref}
          className={cn('form-input w-full min-h-[88px] resize-y py-3', error && 'border-[var(--accent-error)]/50', className)}
          {...props}
        />
        {error && <p className="text-sm text-[var(--accent-error)]">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'