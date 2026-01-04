/**
 * Testing utilities for component isolation
 * Provides helpers for testing route-specific component rendering
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { type ReactElement } from 'react'
import { vi, expect } from 'vitest'

// Mock Next.js router for testing
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

// Mock usePathname hook
export const mockUsePathname = usePathname as ReturnType<typeof vi.fn>

/**
 * Render component with mocked pathname
 */
export function renderWithPathname(
  ui: ReactElement,
  pathname: string,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Mock the pathname
  mockUsePathname.mockReturnValue(pathname)
  
  return render(ui, options)
}

/**
 * Test routes for authentication components
 */
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
} as const

/**
 * Non-auth routes for testing isolation
 */
export const NON_AUTH_ROUTES = {
  DASHBOARD: '/dashboard',
  TRANSACTIONS: '/transactions',
  SETTINGS: '/settings',
  REPORTS: '/reports',
  HOME: '/',
} as const

/**
 * Generate test cases for route isolation
 */
export function generateRouteIsolationTestCases(
  requiredPath: string,
  componentName: string
) {
  const allRoutes = { ...AUTH_ROUTES, ...NON_AUTH_ROUTES }
  const testCases = []
  
  for (const [routeName, routePath] of Object.entries(allRoutes)) {
    const shouldRender = routePath === requiredPath
    testCases.push({
      routeName,
      routePath,
      shouldRender,
      description: shouldRender 
        ? `should render ${componentName} on ${routeName} (${routePath})`
        : `should NOT render ${componentName} on ${routeName} (${routePath})`
    })
  }
  
  return testCases
}

/**
 * Mock error for testing error boundaries
 */
export class MockAuthError extends Error {
  constructor(message: string = 'Mock auth error') {
    super(message)
    this.name = 'MockAuthError'
    this.stack = 'MockAuthError: Mock auth error\n    at auth component'
  }
}

/**
 * Component that throws an error for testing error boundaries
 */
export function ThrowError({ 
  shouldThrow = true, 
  errorMessage = 'Test error for error boundary' 
}: { 
  shouldThrow?: boolean
  errorMessage?: string 
}) {
  if (shouldThrow) {
    throw new MockAuthError(errorMessage)
  }
  return <div data-testid="no-error">No error thrown</div>
}

/**
 * Test helper to verify component isolation
 */
export function expectComponentIsolation(
  container: HTMLElement,
  componentTestId: string,
  shouldBePresent: boolean
) {
  const component = container.querySelector(`[data-testid="${componentTestId}"]`)
  
  if (shouldBePresent) {
    expect(component).toBeInTheDocument()
  } else {
    expect(component).not.toBeInTheDocument()
  }
}

/**
 * Mock authentication context for testing
 */
export const mockAuthContext = {
  user: null,
  session: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  vi.clearAllMocks()
  if (mockUsePathname.mockReset) {
    mockUsePathname.mockReset()
  }
  Object.values(mockRouter).forEach(mock => {
    if (mock.mockReset) {
      mock.mockReset()
    }
  })
  Object.values(mockAuthContext).forEach(mock => {
    if (typeof mock === 'function' && mock.mockReset) {
      mock.mockReset()
    }
  })
}