import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'input'
}

// Button variants function for use in other components
function buttonVariants({ 
  variant = 'primary', 
  size = 'md' 
}: { 
  variant?: ButtonProps['variant']
  size?: ButtonProps['size'] 
} = {}) {
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
    input: 'min-h-[44px] px-4 text-sm', // Match form input height for accessibility
  }

  return cn(baseClasses, variantClasses[variant!], sizeClasses[size!])
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants, type ButtonProps }