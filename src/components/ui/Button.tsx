import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6A65D]/20 disabled:pointer-events-none disabled:opacity-50'
    
    const variantClasses = {
      primary: 'bg-gradient-to-r from-[#E6A65D] to-[#F4B76D] text-[#1C1917] rounded-full hover:shadow-lg hover:shadow-[#E6A65D]/20 hover:scale-[1.02]',
      secondary: 'border border-white/10 text-white/90 rounded-full hover:bg-white/5',
      ghost: 'text-white/70 hover:text-white/90 hover:bg-white/5 rounded-xl',
      outline: 'border border-[#E6A65D]/30 text-[#E6A65D] rounded-full hover:bg-[#E6A65D]/10 hover:border-[#E6A65D]/50',
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