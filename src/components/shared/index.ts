/**
 * Centralized exports for shared components
 * Following structure.md organization patterns
 */

export { FeatureGate } from './feature-gate'
export { ComingSoon } from './coming-soon'
export { LoadingSpinner } from './loading-spinner'
export { FullScreenLoading } from './full-screen-loading'
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
export { NetworkStatus, useNetworkStatus } from './network-status'
export { ServiceStatus, useServiceStatus } from './service-status'
export { NetworkErrorBoundary, withNetworkErrorBoundary } from './network-error-boundary'
export { TransactionErrorBoundary, useTransactionErrorHandler } from './transaction-error-boundary'