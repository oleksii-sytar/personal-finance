import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Authentication middleware for Forma
 * Handles session refresh, route protection, and email verification
 * Following the design document specifications
 * Requirements: 1.6, 4.5, 8.5
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Define route categories
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
  const isVerifyEmailRoute = request.nextUrl.pathname === '/auth/verify-email'
  const isInviteRoute = request.nextUrl.pathname === '/auth/invite'
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/transactions') ||
    request.nextUrl.pathname.startsWith('/categories') ||
    request.nextUrl.pathname.startsWith('/accounts') ||
    request.nextUrl.pathname.startsWith('/reports') ||
    request.nextUrl.pathname.startsWith('/settings')

  // Handle unauthenticated users
  if (!user && isProtectedRoute) {
    // Check if this is a page refresh by looking for specific headers
    const isPageRefresh = request.headers.get('cache-control') === 'max-age=0' ||
                         request.headers.get('sec-fetch-mode') === 'navigate'
    
    // For page refreshes, let the client-side AuthGuard handle authentication
    // This prevents redirect loops during session refresh
    if (isPageRefresh) {
      return response
    }
    
    // For direct navigation without auth, redirect to login
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Handle authenticated users
  if (user) {
    // Check email verification status (Requirements 1.6, 4.5, 8.5)
    const isEmailVerified = !!user.email_confirmed_at
    
    if (!isEmailVerified) {
      // Allow access to verify-email page and auth routes for unverified users
      if (!isVerifyEmailRoute && !isAuthRoute) {
        return NextResponse.redirect(new URL('/auth/verify-email', request.url))
      }
    } else {
      // Redirect verified users away from auth pages (except verify-email and invite for direct links)
      if (isAuthRoute && !isVerifyEmailRoute && !isInviteRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      
      // For workspace-dependent routes, let the client-side AuthGuard handle workspace checks
      // This allows for better UX with loading states and workspace creation flows
    }
  }

  // Handle invitation token preservation and redirect flow
  const inviteToken = request.nextUrl.searchParams.get('token') || 
                     request.nextUrl.searchParams.get('invite_token')
  
  // If there's an invitation token, store it in a cookie for later use
  if (inviteToken && !request.nextUrl.pathname.includes('/auth/invite')) {
    response.cookies.set('pending_invitation_token', inviteToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
  }

  // Handle root path redirect
  if (request.nextUrl.pathname === '/') {
    if (user) {
      // Check if email is verified before redirecting to dashboard
      if (user.email_confirmed_at) {
        // Check for pending invitation token (from URL or cookie)
        const pendingToken = inviteToken || request.cookies.get('pending_invitation_token')?.value
        if (pendingToken) {
          // Clear the cookie and redirect to invitation
          response.cookies.delete('pending_invitation_token')
          return NextResponse.redirect(new URL(`/auth/invite?token=${pendingToken}`, request.url))
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL('/auth/verify-email', request.url))
      }
    } else {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Handle email verification completion - redirect to pending invitation if exists
  if (request.nextUrl.pathname === '/auth/verify-email' && user?.email_confirmed_at) {
    const pendingToken = request.cookies.get('pending_invitation_token')?.value
    if (pendingToken) {
      // Clear the cookie and redirect to invitation
      response.cookies.delete('pending_invitation_token')
      return NextResponse.redirect(new URL(`/auth/invite?token=${pendingToken}`, request.url))
    }
    // Otherwise redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}