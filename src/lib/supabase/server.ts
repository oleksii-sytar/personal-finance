import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from '@/config/backend'

/**
 * Creates a Supabase client for server-side operations
 * Used in Server Components, Server Actions, and API routes
 * Following the authentication-workspace design specifications
 */
export async function createClient() {
  const cookieStore = await cookies()
  
  const supabaseUrl = SUPABASE_URL
  const supabaseAnonKey = SUPABASE_PUBLIC_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}