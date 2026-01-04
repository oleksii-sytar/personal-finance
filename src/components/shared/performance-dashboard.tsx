/**
 * Performance monitoring dashboard for development
 * Requirements: 12.5, 14.5
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  getPerformanceSummary, 
  clearPerformanceMetrics,
  type PageRefreshMetric,
  type ComponentInstantiationMetric,
  type NavigationMetric
} from '@/lib/utils/performance-monitor'

interface PerformanceSummary {
  pageRefreshMetrics: PageRefreshMetric[]
  componentMetrics: ComponentInstantiationMetric[]
  navigationMetrics: NavigationMetric[]
  summary: {
    totalPageRefreshes: number
    routePreservationRate: number
    averageLoadTime: number
    unexpectedComponentLoads: number
    averageNavigationTime: number
  }
}

interface PerformanceDashboardProps {
  isVisible?: boolean
  onClose?: () => void
}

/**
 * Development-only performance monitoring dashboard
 */
export function PerformanceDashboard({ isVisible = false, onClose }: PerformanceDashboardProps) {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshData = () => {
    setIsRefreshing(true)
    const newSummary = getPerformanceSummary()
    setSummary(newSummary)
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const clearData = () => {
    clearPerformanceMetrics()
    setSummary(null)
  }

  useEffect(() => {
    if (isVisible) {
      refreshData()
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(refreshData, 5000)
      return () => clearInterval(interval)
    }
  }, [isVisible])

  // Only render in development
  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null
  }

  if (!summary) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="text-sm flex justify-between items-center">
              Performance Monitor
              <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No performance data available</p>
            <Button onClick={refreshData} className="mt-2" size="sm">
              Start Monitoring
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { summary: stats, pageRefreshMetrics, componentMetrics, navigationMetrics } = summary

  return (
    <div className="fixed bottom-4 right-4 z-50 max-h-96 overflow-y-auto">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-sm flex justify-between items-center">
            Performance Monitor
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshData}
                disabled={isRefreshing}
              >
                {isRefreshing ? '⟳' : '↻'}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearData}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted p-2 rounded">
              <div className="font-medium">Route Preservation</div>
              <div className="text-lg font-bold text-green-600">
                {(stats.routePreservationRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-muted p-2 rounded">
              <div className="font-medium">Avg Load Time</div>
              <div className="text-lg font-bold">
                {stats.averageLoadTime.toFixed(0)}ms
              </div>
            </div>
            <div className="bg-muted p-2 rounded">
              <div className="font-medium">Page Refreshes</div>
              <div className="text-lg font-bold">
                {stats.totalPageRefreshes}
              </div>
            </div>
            <div className="bg-muted p-2 rounded">
              <div className="font-medium">Unexpected Loads</div>
              <div className={`text-lg font-bold ${stats.unexpectedComponentLoads > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.unexpectedComponentLoads}
              </div>
            </div>
          </div>

          {/* Recent Page Refreshes */}
          {pageRefreshMetrics.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Recent Page Refreshes</h4>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {pageRefreshMetrics.slice(-3).map((metric, index) => (
                  <div key={index} className="text-xs bg-muted p-1 rounded">
                    <div className="flex justify-between">
                      <span>{metric.route}</span>
                      <span className={metric.preservedRoute ? 'text-green-600' : 'text-red-600'}>
                        {metric.preservedRoute ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {metric.loadTime.toFixed(0)}ms • {metric.authState}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Component Issues */}
          {stats.unexpectedComponentLoads > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-red-600">Component Issues</h4>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {componentMetrics
                  .filter(m => !m.shouldHaveLoaded)
                  .slice(-3)
                  .map((metric, index) => (
                    <div key={index} className="text-xs bg-red-50 p-1 rounded border border-red-200">
                      <div className="font-medium text-red-800">{metric.componentName}</div>
                      <div className="text-red-600">Loaded on {metric.route}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Navigation Performance */}
          {navigationMetrics.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Navigation Performance</h4>
              <div className="text-xs text-muted-foreground">
                Avg: {stats.averageNavigationTime.toFixed(0)}ms
              </div>
              <div className="space-y-1 max-h-16 overflow-y-auto">
                {navigationMetrics.slice(-2).map((metric, index) => (
                  <div key={index} className="text-xs bg-muted p-1 rounded">
                    <div>{metric.fromRoute} → {metric.toRoute}</div>
                    <div className="text-muted-foreground">
                      {metric.navigationTime.toFixed(0)}ms
                      {metric.wasRedirect && ' (redirect)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Hook to toggle performance dashboard visibility
 */
export function usePerformanceDashboard() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const handleKeyPress = (event: KeyboardEvent) => {
        // Toggle with Ctrl+Shift+P
        if (event.ctrlKey && event.shiftKey && event.key === 'P') {
          event.preventDefault()
          setIsVisible(prev => !prev)
        }
      }

      window.addEventListener('keydown', handleKeyPress)
      return () => window.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  return {
    isVisible,
    show: () => setIsVisible(true),
    hide: () => setIsVisible(false),
    toggle: () => setIsVisible(prev => !prev)
  }
}