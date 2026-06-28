/**
 * Lazy-loaded authentication form components
 * These components are only loaded when their specific routes are accessed
 */

import { lazy } from 'react'

// Lazy load authentication forms to optimize bundle splitting
export const LazyLoginForm = lazy(() =>
  import('../login-form').then((module) => ({ default: module.LoginForm }))
)

export const LazyRegisterForm = lazy(() =>
  import('../register-form').then((module) => ({ default: module.RegisterForm }))
)

export const LazyResetPasswordForm = lazy(() =>
  import('../reset-password-form').then((module) => ({ default: module.ResetPasswordForm }))
)

export const LazyVerifyEmailForm = lazy(() =>
  import('../verify-email-form').then((module) => ({ default: module.VerifyEmailForm }))
)

export const LazyResetPasswordConfirmForm = lazy(() =>
  import('../reset-password-confirm-form').then((module) => ({
    default: module.ResetPasswordConfirmForm,
  }))
)
