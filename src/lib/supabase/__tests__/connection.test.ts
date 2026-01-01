/**
 * Basic connection and infrastructure tests for authentication setup
 * Following the testing standards from testing.md
 */

import { describe, it, expect } from 'vitest'
import { createClient } from '../client'
import { createAdminClient } from '../admin'

describe('Authentication Infrastructure', () => {
  it('should create browser client successfully', () => {
    const supabase = createClient()
    expect(supabase).toBeDefined()
    expect(typeof supabase.auth.getUser).toBe('function')
  })

  it('should create admin client successfully', () => {
    const adminClient = createAdminClient()
    expect(adminClient).toBeDefined()
    expect(typeof adminClient.auth.admin.createUser).toBe('function')
  })

  it('should have required environment variables', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
    expect(process.env.SUPABASE_SERVICE_KEY).toBeDefined()
  })

  it('should connect to database and verify tables exist', async () => {
    const adminClient = createAdminClient()
    
    // Test that we can query the workspaces table (verifies migration worked)
    const { error } = await adminClient
      .from('workspaces')
      .select('id')
      .limit(1)

    // Should not error (table exists and is accessible)
    expect(error).toBeNull()
  })

  it('should verify workspace member tables exist', async () => {
    const adminClient = createAdminClient()
    
    // Test workspace_members table
    const { error: membersError } = await adminClient
      .from('workspace_members')
      .select('id')
      .limit(1)

    expect(membersError).toBeNull()

    // Test workspace_invitations table
    const { error: invitationsError } = await adminClient
      .from('workspace_invitations')
      .select('id')
      .limit(1)

    expect(invitationsError).toBeNull()

    // Test user_profiles table
    const { error: profilesError } = await adminClient
      .from('user_profiles')
      .select('id')
      .limit(1)

    expect(profilesError).toBeNull()
  })

  it('should verify database functions exist', async () => {
    const adminClient = createAdminClient()
    
    // Test that the workspace context function exists
    const { error } = await adminClient.rpc('get_user_workspace_context')
    
    // Function should exist (may return empty result without user session)
    expect(error).toBeNull()
  })
})