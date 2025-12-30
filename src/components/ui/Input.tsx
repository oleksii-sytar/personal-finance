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
            className="block text-sm font-medium text-white/90"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          aria-describedby={errorId}
          className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 placeholder-white/40 focus:border-[#E6A65D] focus:ring-2 focus:ring-[#E6A65D]/20 focus:outline-none transition-all ${error ? 'border-red-400/50 focus:ring-red-400/20 focus:border-red-400' : ''} ${className}`}
          ref={ref}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }