/**
 * Lazy-loaded authentication form components
 * These components are only loaded when their specific routes are accessed
 * Requirements: 4.1, 4.4, 4.5
 */

import { lazy } from 'react'

// Helper function to create monitored lazy components
function createMonitoredLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string
) {
  return lazy(async () => {
    const startTime = performance.now()
    const moduleResult = await importFn()
    const loadTime = performance.now() - startTime
    
    // Track lazy loading performance
    if (typeof window !== 'undefined') {
      console.log(`📦 Lazy loaded ${componentName} in ${loadTime.toFixed(2)}ms`)
    }
    
    return moduleResult
  })
}

// Lazy load authentication forms to optimize bundle splitting
export const LazyLoginForm = createMonitoredLazyComponent(
  () => import('../login-form').then(module => ({ default: module.LoginForm })),
  'LazyLoginForm'
)

export const LazyRegisterForm = createMonitoredLazyComponent(
  () => import('../register-form').then(module => ({ default: module.RegisterForm })),
  'LazyRegisterForm'
)

export const LazyResetPasswordForm = createMonitoredLazyComponent(
  () => import('../reset-password-form').then(module => ({ default: module.ResetPasswordForm })),
  'LazyResetPasswordForm'
)

export const LazyVerifyEmailForm = createMonitoredLazyComponent(
  () => import('../verify-email-form').then(module => ({ default: module.VerifyEmailForm })),
  'LazyVerifyEmailForm'
)

export const LazyResetPasswordConfirmForm = createMonitoredLazyComponent(
  () => import('../reset-password-confirm-form').then(module => ({ default: module.ResetPasswordConfirmForm })),
  'LazyResetPasswordConfirmForm'
)

export const LazyInviteAcceptanceForm = createMonitoredLazyComponent(
  () => import('../invite-acceptance-form').then(module => ({ default: module.InviteAcceptanceForm })),
  'LazyInviteAcceptanceForm'
)

// Lazy load workspace forms
export const LazyWorkspaceCreationForm = createMonitoredLazyComponent(
  () => import('../workspace-creation-form').then(module => ({ default: module.WorkspaceCreationForm })),
  'LazyWorkspaceCreationForm'
)

export const LazyInviteMemberForm = createMonitoredLazyComponent(
  () => import('../invite-member-form').then(module => ({ default: module.InviteMemberForm })),
  'LazyInviteMemberForm'
)