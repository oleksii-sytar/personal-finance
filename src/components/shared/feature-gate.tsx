/**
 * Feature Gate Component
 * 
 * Conditionally renders children based on feature flag status.
 * Used for gradual rollout of new features.
 * 
 * @example
 * ```tsx
 * <FeatureGate feature="FUTURE_TRANSACTIONS" fallback={<ComingSoon />}>
 *   <FutureTransactionForm />
 * </FeatureGate>
 * ```
 */

import { type ReactNode } from 'react'
import { isFeatureEnabled, type FeatureFlag, FEATURE_METADATA } from '@/config/feature-flags'

interface FeatureGateProps {
  feature: FeatureFlag
  children: ReactNode
  fallback?: ReactNode
  showComingSoon?: boolean
}

/**
 * Renders children only if the feature flag is enabled
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback = null,
  showComingSoon = false
}: FeatureGateProps) {
  if (!isFeatureEnabled(feature)) {
    if (showComingSoon) {
      const metadata = FEATURE_METADATA[feature]
      return (
        <div className="p-6 bg-glass rounded-xl border border-primary/10 text-center">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-primary">
              {metadata.name}
            </h3>
            <p className="text-sm text-secondary">
              {metadata.description}
            </p>
            {metadata.availableIn && (
              <span className="inline-block mt-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-medium">
                Coming in {metadata.availableIn}
              </span>
            )}
          </div>
        </div>
      )
    }
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Hook to check if a feature is enabled
 * 
 * @example
 * ```tsx
 * const canUseFutureTransactions = useFeatureFlag('FUTURE_TRANSACTIONS')
 * ```
 */
export function useFeatureFlag(feature: FeatureFlag): boolean {
  return isFeatureEnabled(feature)
}

/**
 * Higher-order component to wrap a component with feature gating
 * 
 * @example
 * ```tsx
 * const FutureTransactionForm = withFeatureGate(
 *   'FUTURE_TRANSACTIONS',
 *   FutureTransactionFormComponent
 * )
 * ```
 */
export function withFeatureGate<P extends object>(
  feature: FeatureFlag,
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={feature} fallback={fallback}>
        <Component {...props} />
      </FeatureGate>
    )
  }
}
