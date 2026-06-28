import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Simplified Authentication middleware for Forma
 * Focuses on basic session validation and token refresh only
 * Complex redirect logic moved to client-side components
 * Requirements: 7.1, 7.2, 7.4, 7.5
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

  // Basic session validation and token refresh - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Define route categories
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard')

  // Only handle basic authentication for protected routes
  if (!user && isProtectedRoute) {
    // Capture return URL for restoration after authentication
    const returnUrl = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('returnUrl', returnUrl)
    return NextResponse.redirect(redirectUrl)
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
