import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PREVIEW_NO_AUTH } from '@/lib/auth/preview'
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from '@/config/backend'

/**
 * Authentication middleware for Forma, alongside the src/app route tree.
 * Focuses on basic session validation and token refresh only
 * Complex redirect logic moved to client-side components
 * Requirements: 7.1, 7.2, 7.4, 7.5
 */
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/mcp') || request.nextUrl.pathname.startsWith('/api/v1/') || request.nextUrl.pathname.startsWith('/.well-known/')) {
    return NextResponse.next()
  }
  if (['/manifest.webmanifest', '/sw.js', '/offline.html'].includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Local preview: skip auth entirely (never contacts Supabase). Dev-only.
  if (PREVIEW_NO_AUTH) {
    return response
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY,
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

  // Basic session validation and token refresh - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Define route categories
  const isProtectedRoute = ['/dashboard', '/accounts', '/transactions', '/reconcile', '/reports', '/categories', '/settings', '/oauth/consent'].some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)
  )

  // Only handle basic authentication for protected routes
  if (!user && isProtectedRoute) {
    // Capture return URL for restoration after authentication
    const returnUrl = request.nextUrl.pathname + request.nextUrl.search
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('returnUrl', returnUrl)
    return NextResponse.redirect(redirectUrl)
  }

  if (request.nextUrl.pathname.startsWith('/oauth/')) { response.headers.set('Referrer-Policy','no-referrer'); response.headers.set('Cache-Control','no-store') }
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