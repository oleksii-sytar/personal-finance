import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@/lib/supabase/client'

/**
 * Integration tests for authentication with cloud database
 * These tests verify that auth operations work correctly with the cloud database
 */
describe('Authentication Integration', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    supabase = createClient()
  })

  it('should handle authentication state properly', async () => {
    // Test getting current session (should work even if no user)
    const { data, error } = await supabase.auth.getSession()
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.session).toBeDefined() // Can be null, but should be defined
  })

  it('should handle sign up validation properly', async () => {
    // Test sign up with invalid email (should fail with proper error)
    const { data, error } = await supabase.auth.signUp({
      email: 'invalid-email',
      password: 'TestPassword123!'
    })

    // Should fail with validation error, not connection error
    expect(error).toBeDefined()
    expect(error?.message).not.toContain('connection')
    expect(error?.message).not.toContain('network')
  })

  it('should handle sign in validation properly', async () => {
    // Test sign in with non-existent user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    })

    // Should fail with auth error, not connection error
    expect(error).toBeDefined()
    expect(error?.message).not.toContain('connection')
    expect(error?.message).not.toContain('network')
  })

  it('should handle password reset requests', async () => {
    // Test password reset (should not error even for non-existent email)
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      'test@example.com',
      { redirectTo: 'http://localhost:3000/auth/reset-password/confirm' }
    )

    // Should not error (Supabase doesn't reveal if email exists)
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should handle sign out gracefully', async () => {
    // Test sign out (should work even if no user is signed in)
    const { error } = await supabase.auth.signOut()

    // Should not error
    expect(error).toBeNull()
  })
})