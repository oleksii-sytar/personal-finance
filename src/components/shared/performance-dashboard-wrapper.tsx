/**
 * Client wrapper for performance dashboard
 * Requirements: 12.5, 14.5
 */

'use client'

import { PerformanceDashboard, usePerformanceDashboard } from './performance-dashboard'

/**
 * Client component wrapper for performance dashboard
 */
export function PerformanceDashboardWrapper() {
  const { isVisible, hide } = usePerformanceDashboard()
  
  return <PerformanceDashboard isVisible={isVisible} onClose={hide} />
}