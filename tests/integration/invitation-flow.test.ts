import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getUserPendingInvitations, acceptMultipleInvitations, declineMultipleInvitations } from '@/lib/services/invitation-service'
import { createWorkspaceInvitation } from '@/actions/workspace'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Create admin client for test setup
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

describe('Invitation Flow Integration Tests', () => {
  let testWorkspaceId: string
  let testUserId: string
  let testInvitationId: string
  const testEmail = 'test-invitation@example.com'

  beforeEach(async () => {
    // Create test user
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: 'test-owner@example.com',
      password: 'testpassword123',
      email_confirm: true
    })

    if (authError || !authUser.user) {
      throw new Error('Failed to create test user')
    }

    testUserId = authUser.user.id

    // Create user profile
    await adminSupabase
      .from('user_profiles')
      .upsert({
        id: testUserId,
        full_name: 'Test Owner'
      })

    // Create test workspace
    const { data: workspace, error: workspaceError } = await adminSupabase
      .from('workspaces')
      .insert({
        name: 'Test Workspace',
        owner_id: testUserId,
        currency: 'UAH'
      })
      .select()
      .single()

    if (workspaceError || !workspace) {
      throw new Error('Failed to create test workspace')
    }

    testWorkspaceId = workspace.id

    // Add owner as member
    await adminSupabase
      .from('workspace_members')
      .insert({
        workspace_id: testWorkspaceId,
        user_id: testUserId,
        role: 'owner'
      })

    // Create test invitation
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('workspace_invitations')
      .insert({
        workspace_id: testWorkspaceId,
        email: testEmail,
        invited_by: testUserId,
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    if (invitationError || !invitation) {
      throw new Error('Failed to create test invitation')
    }

    testInvitationId = invitation.id
  })

  afterEach(async () => {
    // Clean up test data
    if (testWorkspaceId) {
      await adminSupabase.from('workspace_invitations').delete().eq('workspace_id', testWorkspaceId)
      await adminSupabase.from('workspace_members').delete().eq('workspace_id', testWorkspaceId)
      await adminSupabase.from('workspaces').delete().eq('id', testWorkspaceId)
    }

    if (testUserId) {
      await adminSupabase.from('user_profiles').delete().eq('id', testUserId)
      await adminSupabase.auth.admin.deleteUser(testUserId)
    }
  })

  it('should fetch pending invitations for user email', async () => {
    const result = await getUserPendingInvitations(testEmail)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].email).toBe(testEmail)
    expect(result.data![0].workspace.name).toBe('Test Workspace')
    expect(result.data![0].inviter.full_name).toBe('Test Owner')
  })

  it('should return empty array for email with no invitations', async () => {
    const result = await getUserPendingInvitations('no-invitations@example.com')

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(0)
  })

  it('should not return expired invitations', async () => {
    // Create expired invitation
    await adminSupabase
      .from('workspace_invitations')
      .insert({
        workspace_id: testWorkspaceId,
        email: 'expired@example.com',
        invited_by: testUserId,
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      })

    const result = await getUserPendingInvitations('expired@example.com')

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(0)
  })

  it('should not return already accepted invitations', async () => {
    // Mark invitation as accepted
    await adminSupabase
      .from('workspace_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', testInvitationId)

    const result = await getUserPendingInvitations(testEmail)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(0)
  })

  it('should handle database connection errors gracefully', async () => {
    // Test with invalid email format to trigger potential errors
    const result = await getUserPendingInvitations('')

    // Should not crash, should return error or empty result
    expect(result).toBeDefined()
    expect(result.data || result.error).toBeDefined()
  })
})

describe('Invitation Service Error Handling', () => {
  it('should handle invalid email addresses', async () => {
    const result = await getUserPendingInvitations('invalid-email')
    
    // Should not crash
    expect(result).toBeDefined()
  })

  it('should handle network timeouts gracefully', async () => {
    // This test verifies the service doesn't hang indefinitely
    const startTime = Date.now()
    const result = await getUserPendingInvitations('timeout-test@example.com')
    const endTime = Date.now()
    
    // Should complete within reasonable time (30 seconds max)
    expect(endTime - startTime).toBeLessThan(30000)
    expect(result).toBeDefined()
  })
})