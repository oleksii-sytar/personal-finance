import { InputHTMLAttributes, forwardRef, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = error ? `${inputId}-error` : undefined

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-primary"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          aria-describedby={errorId}
          className={`form-input w-full ${error ? 'border-[var(--accent-error)]/50 focus:ring-[var(--accent-error)]/20 focus:border-[var(--accent-error)]' : ''} ${className}`}
          ref={ref}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-[var(--accent-error)]">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }