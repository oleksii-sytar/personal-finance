import { isFeatureEnabled, type FeatureFlag } from '@/config/feature-flags'
import type { ReactNode } from 'react'

interface FeatureGateProps {
  feature: FeatureFlag
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Component that conditionally renders children based on feature flags
 * Following feature-flags.md patterns
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback = null 
}: FeatureGateProps) {
  if (!isFeatureEnabled(feature)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}