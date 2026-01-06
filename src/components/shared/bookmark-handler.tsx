/**
 * Bookmark Handler Component
 * 
 * Handles bookmark and direct URL access with proper authentication flow.
 * Ensures bookmarked pages work correctly for authenticated users and
 * preserves intended destination across authentication.
 * 
 * **Feature: auth-page-refresh-fix, Task 12.3: Bookmark and Direct URL Support**
 * **Validates: Requirements 12.1, 12.2**
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { historyManager } from '@/lib/navigation/history-manager'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { FullScreenLoading } from '@/components/shared/full-screen-loading'

interface BookmarkHandlerProps {
  children: React.ReactNode
}

export function BookmarkHandler({ children }: BookmarkHandlerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace()
  const [isProcessingBookmark, setIsProcessingBookmark] = useState(false)
  const [bookmarkProcessed, setBookmarkProcessed] = useState(false)

  // Check if this is a direct URL access (bookmark or typed URL)
  const isDirectAccess = () => {
    // Check if this is the first page load (no referrer from same origin)
    if (typeof window === 'undefined') return false
    
    const referrer = document.referrer
    const currentOrigin = window.location.origin
    
    // If no referrer or referrer is from different origin, it's likely direct access
    return !referrer || !referrer.startsWith(currentOrigin)
  }

  // Check if the current route requires authentication
  const requiresAuth = () => {
    const protectedRoutes = [
      '/dashboard',
      '/transactions',
      '/categories',
      '/accounts',
      '/reports',
      '/settings',
      '/onboarding'
    ]
    
    return protectedRoutes.some(route => pathname.startsWith(route))
  }

  // Check if the current route requires workspace
  const requiresWorkspace = () => {
    const workspaceRoutes = [
      '/dashboard',
      '/transactions',
      '/categories',
      '/accounts',
      '/reports'
    ]
    
    return workspaceRoutes.some(route => pathname.startsWith(route))
  }

  // Check if the current route requires authentication
  const requiresAuthMemo = useMemo(() => {
    const protectedRoutes = [
      '/dashboard',
      '/transactions',
      '/categories',
      '/accounts',
      '/reports',
      '/settings',
      '/onboarding'
    ]
    
    return protectedRoutes.some(route => pathname.startsWith(route))
  }, [pathname])

  // Check if the current route requires workspace
  const requiresWorkspaceMemo = useMemo(() => {
    const workspaceRoutes = [
      '/dashboard',
      '/transactions',
      '/categories',
      '/accounts',
      '/reports'
    ]
    
    return workspaceRoutes.some(route => pathname.startsWith(route))
  }, [pathname])

  // Process bookmark/direct URL access
  useEffect(() => {
    // Skip if already processed or still loading
    if (bookmarkProcessed || authLoading || workspaceLoading) return

    // Only process if this appears to be direct access
    if (!isDirectAccess()) {
      setBookmarkProcessed(true)
      return
    }

    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    
    console.log('BookmarkHandler: Processing direct URL access:', currentUrl)
    
    setIsProcessingBookmark(true)

    // Handle different scenarios based on requirements 12.1, 12.2

    // 1. Public routes - allow access regardless of auth status
    if (!requiresAuthMemo) {
      console.log('BookmarkHandler: Public route, allowing access')
      setIsProcessingBookmark(false)
      setBookmarkProcessed(true)
      return
    }

    // 2. Protected routes - check authentication requirements
    if (requiresAuthMemo) {
      // User is not authenticated - preserve URL and redirect to login
      if (!isAuthenticated) {
        console.log('BookmarkHandler: Protected route, user not authenticated, preserving URL')
        historyManager.setReturnUrl(currentUrl)
        setIsProcessingBookmark(false)
        setBookmarkProcessed(true)
        // Let SmartRouteGuard handle the redirect
        return
      }

      // User is authenticated but email not verified
      if (user && !user.email_confirmed_at) {
        console.log('BookmarkHandler: User needs email verification, preserving URL')
        historyManager.setReturnUrl(currentUrl)
        setIsProcessingBookmark(false)
        setBookmarkProcessed(true)
        // Let SmartRouteGuard handle the redirect
        return
      }

      // User is authenticated and verified but needs workspace
      if (requiresWorkspaceMemo && !currentWorkspace) {
        console.log('BookmarkHandler: User needs workspace, preserving URL')
        historyManager.setReturnUrl(currentUrl)
        setIsProcessingBookmark(false)
        setBookmarkProcessed(true)
        // Let SmartRouteGuard handle the redirect
        return
      }

      // User meets all requirements - allow access to bookmarked page
      console.log('BookmarkHandler: User meets all requirements, allowing access to bookmarked page')
      setIsProcessingBookmark(false)
      setBookmarkProcessed(true)
      return
    }

    // Fallback
    setIsProcessingBookmark(false)
    setBookmarkProcessed(true)
  }, [
    pathname,
    searchParams,
    isAuthenticated,
    user,
    currentWorkspace,
    authLoading,
    workspaceLoading,
    bookmarkProcessed,
    requiresAuthMemo,
    requiresWorkspaceMemo
  ])

  // Show loading while processing bookmark
  if (isProcessingBookmark) {
    return (
      <FullScreenLoading />
    )
  }

  return <>{children}</>
}

/**
 * Hook to check if current access is from bookmark/direct URL
 */
export function useBookmarkAccess() {
  const [isBookmarkAccess, setIsBookmarkAccess] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || isProcessed) return

    const referrer = document.referrer
    const currentOrigin = window.location.origin
    
    // If no referrer or referrer is from different origin, it's likely direct access
    const isDirect = !referrer || !referrer.startsWith(currentOrigin)
    
    setIsBookmarkAccess(isDirect)
    setIsProcessed(true)
  }, [isProcessed])

  return {
    isBookmarkAccess,
    isProcessed
  }
}

/**
 * Hook to get bookmark-friendly URLs
 */
export function useBookmarkUrl() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const getBookmarkUrl = () => {
    if (typeof window === 'undefined') return ''
    
    const baseUrl = window.location.origin
    const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    
    return baseUrl + fullPath
  }

  const copyBookmarkUrl = async () => {
    const url = getBookmarkUrl()
    
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch (error) {
      console.warn('Failed to copy bookmark URL:', error)
      return false
    }
  }

  return {
    bookmarkUrl: getBookmarkUrl(),
    copyBookmarkUrl
  }
}