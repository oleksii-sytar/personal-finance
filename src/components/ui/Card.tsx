'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'leather';
  children: React.ReactNode;
}

export function Card({ 
  variant = 'glass', 
  className, 
  children, 
  ...props 
}: CardProps) {
  const baseClasses = 'transition-all duration-300';
  
  const variantClasses = {
    glass: 'glass-card p-6',
    solid: 'bg-background-secondary border border-border-primary rounded-glass p-6',
    leather: 'sidebar-leather border border-border-primary rounded-glass p-6',
  };

  return (
    <div 
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({ 
  as: Component = 'h3', 
  className, 
  children, 
  ...props 
}: CardTitleProps) {
  return (
    <Component 
      className={cn('heading-primary text-lg font-semibold', className)} 
      {...props}
    >
      {children}
    </Component>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('body-text', className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-border-primary', className)} {...props}>
      {children}
    </div>
  );
}