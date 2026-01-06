/**
 * Test helper for creating Supabase client without cookies dependency
 * Used in integration tests where Next.js request context is not available
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createTestClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}