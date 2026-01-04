import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'elevated'
  children: React.ReactNode
}

export function Card({ 
  variant = 'glass', 
  className = '', 
  children, 
  ...props 
}: CardProps) {
  const baseClasses = 'transition-all'
  
  const variantClasses = {
    glass: 'glass-card p-6',
    solid: 'bg-secondary border border-primary rounded-3xl p-6',
    elevated: 'glass-card-elevated p-6',
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
      className={`font-space-grotesk text-lg font-semibold text-primary ${className}`} 
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
    <div className={`text-secondary ${className}`} {...props}>
      {children}
    </div>
  )
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardFooter({ className = '', children, ...props }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-primary ${className}`} {...props}>
      {children}
    </div>
  )
}