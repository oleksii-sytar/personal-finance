'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

interface AuthGuardProps {
  children: React.ReactNode
  requireWorkspace?: boolean
  redirectTo?: string
}

/**
 * AuthGuard component for protecting routes
 * Requirements: 1.6, 4.5, 8.5
 */
export function AuthGuard({ 
  children, 
  requireWorkspace = false,
  redirectTo = '/auth/login'
}: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  useEffect(() => {
    if (authLoading || workspaceLoading) return

    // Check if user is authenticated
    if (!user) {
      router.push(redirectTo)
      return
    }

    // Check email verification (Requirements 1.6, 8.5)
    if (!user.email_confirmed_at) {
      router.push('/auth/verify-email')
      return
    }

    // Check workspace requirement (Requirements 4.5)
    if (requireWorkspace && !currentWorkspace) {
      // Redirect to workspace creation or selection
      router.push('/dashboard') // Dashboard will handle workspace creation flow
      return
    }
  }, [user, currentWorkspace, authLoading, workspaceLoading, requireWorkspace, redirectTo, router])

  // Show loading while checking authentication
  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1C1917]">
        <LoadingSpinner />
      </div>
    )
  }

  // Don't render children if user is not authenticated
  if (!user) {
    return null
  }

  // Don't render children if email is not verified
  if (!user.email_confirmed_at) {
    return null
  }

  // Don't render children if workspace is required but not available
  if (requireWorkspace && !currentWorkspace) {
    return null
  }

  return <>{children}</>
}