import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid'
  children: React.ReactNode
}

export function Card({ 
  variant = 'glass', 
  className = '', 
  children, 
  ...props 
}: CardProps) {
  const baseClasses = 'transition-all duration-300'
  
  const variantClasses = {
    glass: 'bg-white/5 backdrop-blur-md border border-white/8 rounded-3xl p-6',
    solid: 'bg-[#2A1D15] border border-white/5 rounded-3xl p-6',
  }

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardHeader({ className = '', children, ...props }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function CardTitle({ 
  as: Component = 'h3', 
  className = '', 
  children, 
  ...props 
}: CardTitleProps) {
  return (
    <Component 
      className={`font-space-grotesk text-lg font-semibold text-white/90 ${className}`} 
      {...props}
    >
      {children}
    </Component>
  )
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardContent({ className = '', children, ...props }: CardContentProps) {
  return (
    <div className={`text-white/70 ${className}`} {...props}>
      {children}
    </div>
  )
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardFooter({ className = '', children, ...props }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-white/10 ${className}`} {...props}>
      {children}
    </div>
  )
}