import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/20 disabled:pointer-events-none disabled:opacity-50'
    
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'text-secondary hover:text-primary hover:bg-glass rounded-xl',
      outline: 'border border-accent text-accent rounded-full hover:bg-[var(--ambient-glow)] hover:border-[var(--accent-primary)]',
    }
    
    const sizeClasses = {
      sm: 'h-8 px-4 text-sm',
      md: 'h-12 px-6',
      lg: 'h-14 px-8 text-lg',
    }

    return (
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, type ButtonProps }