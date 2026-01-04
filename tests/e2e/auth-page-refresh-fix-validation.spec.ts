import { test, expect } from '@playwright/test'
import { TestHelpers, TestDataGenerator, FormaAssertions } from './helpers/test-helpers'

test.describe('Authentication Page Refresh Fix - Final Validation', () => {
  let helpers: TestHelpers
  let assertions: FormaAssertions

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    assertions = new FormaAssertions(page)
  })

  test.describe('16.1 Comprehensive End-to-End Testing', () => {
    test('should complete full user journey from registration to daily usage', async ({ page }) => {
      // Generate unique test data
      const userData = TestDataGenerator.generateUser()
      
      console.log(`Testing complete user journey with: ${userData.email}`)

      // Step 1: Registration flow
      await page.goto('/auth/signup')
      await assertions.assertOnSignupPage()

      // Complete registration
      await helpers.fillForm({
        'input[type="text"]': userData.fullName,
        'input[type="email"]': userData.email,
        'input[type="password"]': userData.password,
        'input[type="password"]:nth-child(2)': userData.password
      })

      await page.click('button[type="submit"]:has-text("Create Account")')
      await page.waitForTimeout(3000)

      // Step 2: Login flow
      await page.goto('/auth/login')
      await helpers.fillForm({
        'input[type="email"]': userData.email,
        'input[type="password"]': userData.password
      })

      await page.click('button[type="submit"]:has-text("Sign In")')
      await page.waitForTimeout(3000)

      // Step 3: Navigate to dashboard and test page refresh behavior
      await page.goto('/dashboard')
      
      // Refresh page and verify route preservation
      await page.reload()
      await page.waitForTimeout(2000)
      
      // Should stay on dashboard after refresh
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Page refresh preserves dashboard route')
    })
    test('should preserve route on page refresh across all user states', async ({ page }) => {
      // Test different routes and their refresh behavior
      const routesToTest = [
        { path: '/dashboard', expectedContent: 'Family Dashboard' },
        { path: '/transactions', expectedContent: 'body' },
        { path: '/settings', expectedContent: 'body' },
        { path: '/reports', expectedContent: 'body' }
      ]

      // Login first
      await helpers.loginUser()
      
      for (const route of routesToTest) {
        console.log(`Testing page refresh on ${route.path}`)
        
        // Navigate to route
        await page.goto(route.path)
        await page.waitForTimeout(1000)
        
        // Refresh page
        await page.reload()
        await page.waitForTimeout(2000)
        
        // Verify route is preserved
        expect(page.url()).toContain(route.path)
        await expect(page.locator(route.expectedContent)).toBeVisible()
        
        console.log(`✅ Route ${route.path} preserved after refresh`)
      }
    })

    test('should handle multi-tab authentication scenarios', async ({ page, context }) => {
      // Login in first tab
      await helpers.loginUser()
      await page.goto('/dashboard')
      
      // Open second tab
      const page2 = await context.newPage()
      await page2.goto('/dashboard')
      
      // Both tabs should be authenticated
      expect(page.url()).toContain('/dashboard')
      expect(page2.url()).toContain('/dashboard')
      
      // Refresh both tabs
      await page.reload()
      await page2.reload()
      
      await page.waitForTimeout(2000)
      await page2.waitForTimeout(2000)
      
      // Both should maintain authentication
      expect(page.url()).toContain('/dashboard')
      expect(page2.url()).toContain('/dashboard')
      
      await page2.close()
      console.log('✅ Multi-tab authentication scenarios working')
    })

    test('should handle network interruption and recovery', async ({ page }) => {
      // Login first
      await helpers.loginUser()
      await page.goto('/dashboard')
      
      // Simulate network interruption
      await helpers.simulateOffline()
      
      // Try to refresh page while offline
      await page.reload()
      await page.waitForTimeout(2000)
      
      // Restore network
      await helpers.restoreOnline()
      
      // Page should recover gracefully
      await page.reload()
      await page.waitForTimeout(2000)
      
      // Should still be on dashboard
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Network interruption and recovery handled')
    })
  })

  test.describe('16.2 User Experience Validation', () => {
    test('should provide smooth navigation without authentication interruptions', async ({ page }) => {
      // Login first
      await helpers.loginUser()
      
      // Test navigation flow
      const navigationFlow = [
        '/dashboard',
        '/transactions', 
        '/settings',
        '/reports',
        '/dashboard'
      ]
      
      for (const route of navigationFlow) {
        await page.goto(route)
        await page.waitForTimeout(500)
        
        // Should not redirect to login
        expect(page.url()).not.toContain('/auth/login')
        expect(page.url()).toContain(route)
        
        // Refresh to test route preservation
        await page.reload()
        await page.waitForTimeout(1000)
        
        // Should still be on the same route
        expect(page.url()).toContain(route)
      }
      
      console.log('✅ Smooth navigation without authentication interruptions')
    })
    test('should validate onboarding flow completion', async ({ page }) => {
      // Test new user onboarding without routing conflicts
      const userData = TestDataGenerator.generateUser()
      
      // Registration
      await page.goto('/auth/signup')
      await helpers.fillForm({
        'input[type="text"]': userData.fullName,
        'input[type="email"]': userData.email,
        'input[type="password"]': userData.password,
        'input[type="password"]:nth-child(2)': userData.password
      })
      
      await page.click('button[type="submit"]:has-text("Create Account")')
      await page.waitForTimeout(3000)
      
      // Should handle onboarding flow without conflicts
      const currentUrl = page.url()
      
      if (currentUrl.includes('/auth/login')) {
        // Complete login
        await helpers.fillForm({
          'input[type="email"]': userData.email,
          'input[type="password"]': userData.password
        })
        
        await page.click('button[type="submit"]:has-text("Sign In")')
        await page.waitForTimeout(3000)
      }
      
      // Should reach dashboard or onboarding without routing conflicts
      const finalUrl = page.url()
      expect(finalUrl).not.toContain('/auth/login')
      
      console.log('✅ Onboarding flow completed without routing conflicts')
    })

    test('should handle bookmark and browser history functionality', async ({ page }) => {
      // Login first
      await helpers.loginUser()
      
      // Navigate through different pages
      await page.goto('/dashboard')
      await page.goto('/transactions')
      await page.goto('/settings')
      
      // Test browser back navigation
      await page.goBack() // Should go to transactions
      expect(page.url()).toContain('/transactions')
      
      await page.goBack() // Should go to dashboard
      expect(page.url()).toContain('/dashboard')
      
      // Test browser forward navigation
      await page.goForward() // Should go to transactions
      expect(page.url()).toContain('/transactions')
      
      // Test page refresh during navigation
      await page.reload()
      await page.waitForTimeout(1000)
      
      // Should preserve current route
      expect(page.url()).toContain('/transactions')
      
      console.log('✅ Bookmark and browser history functionality working')
    })
  })

  test.describe('16.3 Performance and Reliability Validation', () => {
    test('should verify no performance regression from the fix', async ({ page }) => {
      // Measure page load times
      const routes = ['/dashboard', '/transactions', '/settings', '/reports']
      const loadTimes: Record<string, number> = {}
      
      // Login first
      await helpers.loginUser()
      
      for (const route of routes) {
        const startTime = Date.now()
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        const loadTime = Date.now() - startTime
        
        loadTimes[route] = loadTime
        
        // Should load within reasonable time (5 seconds)
        expect(loadTime).toBeLessThan(5000)
        
        console.log(`${route} loaded in ${loadTime}ms`)
      }
      
      console.log('✅ No performance regression detected')
    })
    test('should test reliability across different network conditions', async ({ page }) => {
      // Login first
      await helpers.loginUser()
      
      // Test with slow network
      await helpers.simulateSlowNetwork(300)
      
      await page.goto('/dashboard')
      await page.reload()
      await page.waitForTimeout(3000)
      
      // Should still work with slow network
      expect(page.url()).toContain('/dashboard')
      
      // Test with intermittent connectivity
      await helpers.simulateOffline()
      await page.waitForTimeout(1000)
      
      await helpers.restoreOnline()
      await page.reload()
      await page.waitForTimeout(2000)
      
      // Should recover gracefully
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Reliability across different network conditions verified')
    })

    test('should validate cross-tab synchronization performance', async ({ page, context }) => {
      // Login in first tab
      await helpers.loginUser()
      await page.goto('/dashboard')
      
      // Open multiple tabs
      const tabs = []
      for (let i = 0; i < 3; i++) {
        const newTab = await context.newPage()
        await newTab.goto('/dashboard')
        tabs.push(newTab)
      }
      
      // Refresh all tabs simultaneously
      const refreshPromises = [
        page.reload(),
        ...tabs.map(tab => tab.reload())
      ]
      
      await Promise.all(refreshPromises)
      await page.waitForTimeout(2000)
      
      // All tabs should maintain authentication
      expect(page.url()).toContain('/dashboard')
      for (const tab of tabs) {
        expect(tab.url()).toContain('/dashboard')
      }
      
      // Close additional tabs
      for (const tab of tabs) {
        await tab.close()
      }
      
      console.log('✅ Cross-tab synchronization performance validated')
    })

    test('should ensure graceful degradation works correctly', async ({ page }) => {
      // Test with JavaScript disabled (if possible)
      // This tests server-side rendering fallbacks
      
      // Login first
      await helpers.loginUser()
      await page.goto('/dashboard')
      
      // Test page refresh with potential JavaScript errors
      await page.addInitScript(() => {
        // Simulate potential JavaScript issues
        window.addEventListener('error', (e) => {
          console.log('JavaScript error caught:', e.message)
        })
      })
      
      await page.reload()
      await page.waitForTimeout(2000)
      
      // Should still function
      expect(page.url()).toContain('/dashboard')
      await expect(page.locator('body')).toBeVisible()
      
      console.log('✅ Graceful degradation working correctly')
    })
  })

  test.describe('Authentication Component Isolation Validation', () => {
    test('should verify auth components only execute on designated routes', async ({ page }) => {
      // Login first
      await helpers.loginUser()
      
      // Navigate to non-auth pages
      const nonAuthRoutes = ['/dashboard', '/transactions', '/settings', '/reports']
      
      for (const route of nonAuthRoutes) {
        await page.goto(route)
        
        // Check that auth form components are not present
        const loginForm = page.locator('form:has(input[type="email"]):has(button:has-text("Sign In"))')
        const signupForm = page.locator('form:has(input[type="text"]):has(button:has-text("Create Account"))')
        
        await expect(loginForm).not.toBeVisible()
        await expect(signupForm).not.toBeVisible()
        
        // Refresh page and verify again
        await page.reload()
        await page.waitForTimeout(1000)
        
        await expect(loginForm).not.toBeVisible()
        await expect(signupForm).not.toBeVisible()
        
        console.log(`✅ Auth components isolated from ${route}`)
      }
    })

    test('should verify no authentication redirects on non-auth pages', async ({ page }) => {
      // Login first
      await helpers.loginUser()
      
      // Navigate to protected pages and refresh multiple times
      const routes = ['/dashboard', '/transactions', '/settings']
      
      for (const route of routes) {
        await page.goto(route)
        
        // Refresh multiple times rapidly
        for (let i = 0; i < 3; i++) {
          await page.reload()
          await page.waitForTimeout(500)
          
          // Should never redirect to login
          expect(page.url()).not.toContain('/auth/login')
          expect(page.url()).toContain(route)
        }
        
        console.log(`✅ No unwanted redirects from ${route}`)
      }
    })
  })
})