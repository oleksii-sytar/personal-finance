/**
 * Centralized exports for shared components
 * Following structure.md organization patterns
 */

export { FeatureGate } from './feature-gate'
export { ComingSoon } from './coming-soon'
export { EmptyStateWithAction } from './empty-state-with-action'
export { LoadingSpinner } from './loading-spinner'
export { FullScreenLoading } from './full-screen-loading'
export { FormaLogoLoader, FullScreenFormaLoader } from './forma-logo-loader'
export { EnhancedLoadingState } from './enhanced-loading-state'
export { CurrencyDisplay } from './currency-display'
export { OnboardingFlow } from './onboarding-flow'
export { MemberManagement } from './member-management'
export { SmartRouteGuard, RouteGuard } from './smart-route-guard'
export { NavigationManager } from './navigation-manager'
export { 
  AuthNavigationHandler,
  LoginNavigationHandler,
  SignupNavigationHandler,
  ResetPasswordNavigationHandler,
  VerifyEmailNavigationHandler
} from './auth-navigation-handler'
export { WorkspaceSelector } from './workspace-selector'
export { WorkspaceSettings } from './workspace-settings'
export { ThemeToggle } from './theme-toggle'
export { AuthPageGuard } from './auth-page-guard'
export { AuthComponentErrorBoundary } from './auth-component-error-boundary'
export { AuthSyncManager } from './auth-sync-manager'
export { OfflineManager, useOfflineManager } from './offline-manager'
export { TransactionErrorBoundary, useTransactionErrorHandler } from './transaction-error-boundary'
export { MonthSelector } from './month-selector'
export { FAQSection } from './faq-section'