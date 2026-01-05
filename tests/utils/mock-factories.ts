/**
 * Mock factories for test utilities
 * Provides properly typed mock objects for tests
 */

import { vi } from 'vitest'
import type { User, Session } from '@supabase/supabase-js'

// Export the interfaces that are used in tests
export interface WorkspaceContextType {
  currentWorkspace: any
  workspaces: any[]
  members: any[]
  invitations: any[]
  loading: boolean
  createWorkspace: any
  switchWorkspace: any
  inviteMember: any
  removeMember: any
  transferOwnership: any
  refreshWorkspaces: any
}

export interface PostLoginCheckResult {
  hasPendingInvitations: boolean
  pendingInvitations: any[]
  checkComplete: boolean
  isLoading: boolean
  error: any
}

/**
 * Creates a properly typed mock User object
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: { full_name: 'Test User' },
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    phone: undefined,
    phone_confirmed_at: undefined,
    confirmed_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: '2024-01-01T00:00:00Z',
    role: 'authenticated',
    ...overrides,
  }
}

/**
 * Creates a properly typed mock Session object
 */
export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  }
}

/**
 * Creates a properly typed mock WorkspaceContextType
 */
export function createMockWorkspaceContext(overrides: Partial<WorkspaceContextType> = {}): WorkspaceContextType {
  return {
    currentWorkspace: null,
    workspaces: [],
    members: [],
    invitations: [],
    loading: false,
    createWorkspace: vi.fn(),
    switchWorkspace: vi.fn(),
    inviteMember: vi.fn(),
    removeMember: vi.fn(),
    transferOwnership: vi.fn(),
    refreshWorkspaces: vi.fn(),
    ...overrides,
  }
}

/**
 * Creates a properly typed mock PostLoginCheckResult
 */
export function createMockPostLoginCheck(overrides: Partial<PostLoginCheckResult> = {}): PostLoginCheckResult {
  return {
    hasPendingInvitations: false,
    pendingInvitations: [],
    checkComplete: true,
    isLoading: false,
    error: null,
    ...overrides,
  }
}