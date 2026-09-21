import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from '@/config/backend'

/**
 * Creates a Supabase client for browser-side operations
 * Used in Client Components and client-side code
 * Following the authentication-workspace design specifications
 */
export function createClient() {
  const supabaseUrl = SUPABASE_URL
  const supabaseAnonKey = SUPABASE_PUBLIC_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Default export for backward compatibility
export default createClient()