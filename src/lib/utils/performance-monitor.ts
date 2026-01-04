/**
 * Performance monitoring utilities for authentication and navigation
 * Requirements: 12.5, 14.5
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

interface PageRefreshMetric {
  route: string
  preservedRoute: boolean
  loadTime: number
  authState: 'authenticated' | 'unauthenticated' | 'loading'
  timestamp: number
}

interface ComponentInstantiationMetric {
  componentName: string
  route: string
  shouldHaveLoaded: boolean
  actuallyLoaded: boolean
  loadTime?: number
  timestamp: number
}

interface NavigationMetric {
  fromRoute: string
  toRoute: string
  navigationTime: number
  wasRedirect: boolean
  authState: 'authenticated' | 'unauthenticated' | 'loading'
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private pageRefreshMetrics: PageRefreshMetric[] = []
  private componentMetrics: ComponentInstantiationMetric[] = []
  private navigationMetrics: NavigationMetric[] = []
  private isEnabled: boolean = true

  constructor() {
    // Only enable in development or when explicitly enabled
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true'
    
    if (this.isEnabled && typeof window !== 'undefined') {
      this.setupPageRefreshTracking()
      this.setupNavigationTracking()
    }
  }

  /**
   * Track page refresh behavior
   * Requirements: 12.5
   */
  trackPageRefresh(route: string, authState: PageRefreshMetric['authState']) {
    if (!this.isEnabled || typeof window === 'undefined') return

    const startTime = performance.now()
    const preservedRoute = window.location.pathname === route

    // Track load time
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime
      
      const metric: PageRefreshMetric = {
        route,
        preservedRoute,
        loadTime,
        authState,
        timestamp: Date.now()
      }

      this.pageRefreshMetrics.push(metric)
      this.logMetric('page-refresh', metric)
      
      // Report to analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'page_refresh', {
          route,
          preserved_route: preservedRoute,
          load_time: loadTime,
          auth_state: authState
        })
      }
    }, { once: true })
  }

  /**
   * Track authentication component instantiation
   * Requirements: 12.5, 14.5
   */
  trackComponentInstantiation(
    componentName: string,
    route: string,
    shouldHaveLoaded: boolean
  ) {
    if (!this.isEnabled) return

    const startTime = performance.now()
    
    const metric: ComponentInstantiationMetric = {
      componentName,
      route,
      shouldHaveLoaded,
      actuallyLoaded: true, // If this is called, component was loaded
      loadTime: performance.now() - startTime,
      timestamp: Date.now()
    }

    this.componentMetrics.push(metric)
    this.logMetric('component-instantiation', metric)

    // Alert if component loaded when it shouldn't have
    if (!shouldHaveLoaded) {
      console.warn(`⚠️ Component ${componentName} loaded on route ${route} when it shouldn't have`)
      
      // Report to error tracking
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'unexpected_component_load', {
          component_name: componentName,
          route,
          should_have_loaded: shouldHaveLoaded
        })
      }
    }
  }

  /**
   * Track navigation performance and user experience
   * Requirements: 12.5, 14.5
   */
  trackNavigation(
    fromRoute: string,
    toRoute: string,
    wasRedirect: boolean,
    authState: NavigationMetric['authState']
  ) {
    if (!this.isEnabled) return

    const startTime = performance.now()
    
    // Use requestIdleCallback to measure when navigation is complete
    const measureComplete = () => {
      const navigationTime = performance.now() - startTime
      
      const metric: NavigationMetric = {
        fromRoute,
        toRoute,
        navigationTime,
        wasRedirect,
        authState,
        timestamp: Date.now()
      }

      this.navigationMetrics.push(metric)
      this.logMetric('navigation', metric)

      // Report slow navigations
      if (navigationTime > 1000) {
        console.warn(`🐌 Slow navigation detected: ${fromRoute} → ${toRoute} (${navigationTime}ms)`)
      }
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(measureComplete)
    } else {
      setTimeout(measureComplete, 0)
    }
  }

  /**
   * Track general performance metrics
   */
  trackMetric(name: string, value: number, metadata?: Record<string, any>) {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)
    this.logMetric('general', metric)
  }

  /**
   * Get performance summary for debugging
   */
  getPerformanceSummary() {
    if (!this.isEnabled) return null

    return {
      pageRefreshMetrics: this.pageRefreshMetrics,
      componentMetrics: this.componentMetrics,
      navigationMetrics: this.navigationMetrics,
      generalMetrics: this.metrics,
      summary: {
        totalPageRefreshes: this.pageRefreshMetrics.length,
        routePreservationRate: this.pageRefreshMetrics.length > 0 
          ? this.pageRefreshMetrics.filter(m => m.preservedRoute).length / this.pageRefreshMetrics.length 
          : 0,
        averageLoadTime: this.pageRefreshMetrics.length > 0
          ? this.pageRefreshMetrics.reduce((sum, m) => sum + m.loadTime, 0) / this.pageRefreshMetrics.length
          : 0,
        unexpectedComponentLoads: this.componentMetrics.filter(m => !m.shouldHaveLoaded).length,
        averageNavigationTime: this.navigationMetrics.length > 0
          ? this.navigationMetrics.reduce((sum, m) => sum + m.navigationTime, 0) / this.navigationMetrics.length
          : 0
      }
    }
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics() {
    this.metrics = []
    this.pageRefreshMetrics = []
    this.componentMetrics = []
    this.navigationMetrics = []
  }

  /**
   * Setup automatic page refresh tracking
   */
  private setupPageRefreshTracking() {
    if (typeof window === 'undefined') return

    // Track if page was refreshed
    const navigationEntries = performance.getEntriesByType('navigation')
    const isPageRefresh = navigationEntries.length > 0 && 
      (navigationEntries[0] as PerformanceNavigationTiming).type === 'reload'
    
    if (isPageRefresh) {
      console.log('📊 Page refresh detected, tracking performance...')
      
      // Track the refresh
      this.trackPageRefresh(window.location.pathname, 'loading')
    }
  }

  /**
   * Setup automatic navigation tracking
   */
  private setupNavigationTracking() {
    if (typeof window === 'undefined') return

    let lastRoute = window.location.pathname
    
    // Listen for route changes (works with Next.js App Router)
    const observer = new MutationObserver(() => {
      const currentRoute = window.location.pathname
      if (currentRoute !== lastRoute) {
        this.trackNavigation(lastRoute, currentRoute, false, 'loading')
        lastRoute = currentRoute
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  /**
   * Log metrics to console in development
   */
  private logMetric(type: string, metric: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [${type}]`, metric)
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Convenience functions
export const trackPageRefresh = (route: string, authState: PageRefreshMetric['authState']) => 
  performanceMonitor.trackPageRefresh(route, authState)

export const trackComponentInstantiation = (componentName: string, route: string, shouldHaveLoaded: boolean) =>
  performanceMonitor.trackComponentInstantiation(componentName, route, shouldHaveLoaded)

export const trackNavigation = (fromRoute: string, toRoute: string, wasRedirect: boolean, authState: NavigationMetric['authState']) =>
  performanceMonitor.trackNavigation(fromRoute, toRoute, wasRedirect, authState)

export const trackMetric = (name: string, value: number, metadata?: Record<string, any>) =>
  performanceMonitor.trackMetric(name, value, metadata)

export const getPerformanceSummary = () => performanceMonitor.getPerformanceSummary()

export const clearPerformanceMetrics = () => performanceMonitor.clearMetrics()

// Export types for use in components
export type { PerformanceMetric, PageRefreshMetric, ComponentInstantiationMetric, NavigationMetric }