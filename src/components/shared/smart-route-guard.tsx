'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { FullScreenLoading } from '@/components/shared/full-screen-loading'
import { createLoginUrlWithReturn } from '@/lib/utils/return-url'

interface SmartRouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireEmailVerification?: boolean
  loadingComponent?: React.ComponentType
}

function SmartRouteGuardInternal({
  children,
  requireAuth = true,
  requireEmailVerification = false,
  loadingComponent: LoadingComponent = () => <FullScreenLoading />,
}: SmartRouteGuardProps) {
  const { user, isAuthenticated, loading } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (loading || isRedirecting) return

    if (requireAuth && !isAuthenticated) {
      setIsRedirecting(true)
      router.push(createLoginUrlWithReturn(pathname, searchParams.toString(), 'required'))
      return
    }

    if (requireEmailVerification && user && !user.email_confirmed_at) {
      setIsRedirecting(true)
      router.push('/auth/verify-email')
      return
    }

    setIsRedirecting(false)
  }, [
    requireAuth,
    requireEmailVerification,
    isAuthenticated,
    user,
    loading,
    pathname,
    searchParams,
    router,
    isRedirecting,
  ])

  if (loading || isRedirecting) {
    return <LoadingComponent />
  }

  if (requireAuth && !isAuthenticated) {
    return <LoadingComponent />
  }

  if (requireEmailVerification && user && !user.email_confirmed_at) {
    return <LoadingComponent />
  }

  return <>{children}</>
}

export function RouteGuard({
  children,
  requireAuth = true,
}: {
  children: React.ReactNode
  requireAuth?: boolean
}) {
  return (
    <SmartRouteGuard requireAuth={requireAuth}>
      {children}
    </SmartRouteGuard>
  )
}

export function SmartRouteGuard(props: SmartRouteGuardProps) {
  return (
    <Suspense fallback={<FullScreenLoading />}>
      <SmartRouteGuardInternal {...props} />
    </Suspense>
  )
}
