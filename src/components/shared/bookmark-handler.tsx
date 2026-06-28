'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { historyManager } from '@/lib/navigation/history-manager'
import { FullScreenLoading } from '@/components/shared/full-screen-loading'

interface BookmarkHandlerProps {
  children: React.ReactNode
}

const protectedRoutes = ['/dashboard']

export function BookmarkHandler({ children }: BookmarkHandlerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated, loading } = useAuth()
  const [isProcessingBookmark, setIsProcessingBookmark] = useState(false)
  const [bookmarkProcessed, setBookmarkProcessed] = useState(false)

  useEffect(() => {
    if (bookmarkProcessed || loading) return

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    if (!isProtectedRoute) {
      setBookmarkProcessed(true)
      return
    }

    const referrer = document.referrer
    const isDirectAccess = !referrer || !referrer.startsWith(window.location.origin)
    if (isDirectAccess && !isAuthenticated) {
      const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      setIsProcessingBookmark(true)
      historyManager.setReturnUrl(currentUrl)
    }

    setIsProcessingBookmark(false)
    setBookmarkProcessed(true)
  }, [bookmarkProcessed, loading, pathname, searchParams, isAuthenticated])

  if (isProcessingBookmark) {
    return <FullScreenLoading />
  }

  return <>{children}</>
}

export function useBookmarkAccess() {
  const [isBookmarkAccess, setIsBookmarkAccess] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)

  useEffect(() => {
    if (isProcessed) return

    const referrer = document.referrer
    setIsBookmarkAccess(!referrer || !referrer.startsWith(window.location.origin))
    setIsProcessed(true)
  }, [isProcessed])

  return {
    isBookmarkAccess,
    isProcessed,
  }
}

export function useBookmarkUrl() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const getBookmarkUrl = () => {
    if (typeof window === 'undefined') return ''

    const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    return window.location.origin + fullPath
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
    copyBookmarkUrl,
  }
}
