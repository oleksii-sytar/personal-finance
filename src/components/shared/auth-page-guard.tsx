'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

/**
 * AuthPageGuard component ensures authentication components only render on their designated routes
 * This prevents global instantiation and unwanted redirects on page refresh
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
interface AuthPageGuardProps {
  children: ReactNode
  requiredPath: string
  fallback?: ReactNode
}

export function AuthPageGuard({ 
  children, 
  requiredPath, 
  fallback = null 
}: AuthPageGuardProps) {
  const pathname = usePathname()
  
  // Only render children if on the correct route
  if (pathname !== requiredPath) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}