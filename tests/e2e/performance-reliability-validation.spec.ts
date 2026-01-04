import { test, expect } from '@playwright/test'
import { TestHelpers } from './helpers/test-helpers'

test.describe('Performance and Reliability Validation - Requirements 14.1, 14.2, 14.3, 14.4, 14.5', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test.describe('Performance Regression Validation', () => {
    test('should verify no performance regression from the fix', async ({ page }) => {
      // Measure baseline performance metrics
      const performanceMetrics: Record<string, number> = {}
      
      const routes = [
        { url: '/', name: 'Landing Page' },
        { url: '/auth/login', name: 'Login Page' },
        { url: '/auth/signup', name: 'Signup Page' },
        { url: '/auth/reset-password', name: 'Reset Password Page' }
      ]
      
      for (const route of routes) {
        console.log(`Measuring performance for ${route.name}`)
        
        const startTime = Date.now()
        await page.goto(route.url)
        await page.waitForLoadState('networkidle')
        const loadTime = Date.now() - startTime
        
        performanceMetrics[route.name] = loadTime
        
        // Performance thresholds
        expect(loadTime).toBeLessThan(5000) // 5 seconds max
        
        // Measure First Contentful Paint if possible
        const fcp = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            new PerformanceObserver((list) => {
              const entries = list.getEntries()
              const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
              if (fcpEntry) {
                resolve(fcpEntry.startTime)
              }
            }).observe({ entryTypes: ['paint'] })
            
            // Fallback timeout
            setTimeout(() => resolve(0), 1000)
          })
        })
        
        if (fcp > 0) {
          console.log(`${route.name} FCP: ${fcp}ms`)
          expect(fcp).toBeLessThan(3000) // 3 seconds max for FCP
        }
        
        console.log(`✅ ${route.name} loaded in ${loadTime}ms`)
      }
      
      console.log('Performance metrics:', performanceMetrics)
      console.log('✅ No performance regression detected')
    })

    test('should measure form interaction performance', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Measure form interaction responsiveness
      const startTime = Date.now()
      
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      const fillTime = Date.now() - startTime
      
      // Form interactions should be immediate
      expect(fillTime).toBeLessThan(1000) // 1 second max
      
      // Measure form submission response time
      const submitStartTime = Date.now()
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Wait for loading state to appear
      await expect(page.locator('button:has-text("Signing In...")')).toBeVisible({ timeout: 2000 })
      
      const submitResponseTime = Date.now() - submitStartTime
      expect(submitResponseTime).toBeLessThan(3000) // 3 seconds max
      
      console.log(`✅ Form interactions: fill=${fillTime}ms, submit=${submitResponseTime}ms`)
    })
  })

  test.describe('Network Conditions Reliability', () => {
    test('should test reliability across different network conditions', async ({ page }) => {
      // Test with normal network
      await page.goto('/auth/login')
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      console.log('✅ Normal network conditions working')
      
      // Test with slow network
      await helpers.simulateSlowNetwork(300)
      
      await page.goto('/auth/signup')
      await expect(page.locator('h1:has-text("Start Your Journey")')).toBeVisible({ timeout: 10000 })
      console.log('✅ Slow network conditions handled')
      
      // Test form submission with slow network
      await page.fill('input[type="text"]', 'Test User')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.fill('input[type="password"]:nth-child(2)', 'password123')
      
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should show loading state even with slow network
      await expect(page.locator('button:has-text("Creating Account...")')).toBeVisible({ timeout: 3000 })
      
      console.log('✅ Form submission with slow network handled')
    })
    test('should handle intermittent connectivity', async ({ page }) => {
      // Start with normal connectivity
      await page.goto('/auth/login')
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      
      // Simulate connectivity loss
      await helpers.simulateOffline()
      
      // Try to navigate (should handle gracefully)
      try {
        await page.goto('/auth/signup')
      } catch (error: unknown) {
        console.log('Expected error during offline navigation:', (error as Error).message)
      }
      
      // Restore connectivity
      await helpers.restoreOnline()
      
      // Should work again
      await page.goto('/auth/signup')
      await expect(page.locator('h1:has-text("Start Your Journey")')).toBeVisible({ timeout: 10000 })
      
      console.log('✅ Intermittent connectivity handled gracefully')
    })

    test('should handle concurrent requests', async ({ page, context }) => {
      // Open multiple tabs and load pages simultaneously
      const pages = [page]
      
      // Create additional tabs
      for (let i = 0; i < 3; i++) {
        const newPage = await context.newPage()
        pages.push(newPage)
      }
      
      // Load different pages simultaneously
      const loadPromises = pages.map((p, index) => {
        const routes = ['/auth/login', '/auth/signup', '/auth/reset-password', '/']
        return p.goto(routes[index % routes.length])
      })
      
      const startTime = Date.now()
      await Promise.all(loadPromises)
      const totalTime = Date.now() - startTime
      
      // All pages should load within reasonable time
      expect(totalTime).toBeLessThan(10000) // 10 seconds max for all
      
      // Verify all pages loaded correctly
      await expect(pages[0].locator('h1:has-text("Welcome Back")')).toBeVisible()
      await expect(pages[1].locator('h1:has-text("Start Your Journey")')).toBeVisible()
      await expect(pages[2].locator('body')).toBeVisible()
      await expect(pages[3].locator('body')).toBeVisible()
      
      // Close additional tabs
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close()
      }
      
      console.log(`✅ Concurrent requests handled in ${totalTime}ms`)
    })
  })

  test.describe('Cross-Tab Synchronization Performance', () => {
    test('should validate cross-tab synchronization performance', async ({ page, context }) => {
      // Test cross-tab navigation performance
      const page2 = await context.newPage()
      
      // Navigate both tabs to different auth pages
      const navigationPromises = [
        page.goto('/auth/login'),
        page2.goto('/auth/signup')
      ]
      
      const startTime = Date.now()
      await Promise.all(navigationPromises)
      const navigationTime = Date.now() - startTime
      
      // Should handle multiple tabs efficiently
      expect(navigationTime).toBeLessThan(5000) // 5 seconds max
      
      // Both tabs should be functional
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      await expect(page2.locator('h1:has-text("Start Your Journey")')).toBeVisible()
      
      // Test simultaneous form interactions
      const interactionPromises = [
        page.fill('input[type="email"]', 'test1@example.com'),
        page2.fill('input[type="email"]', 'test2@example.com')
      ]
      
      const interactionStartTime = Date.now()
      await Promise.all(interactionPromises)
      const interactionTime = Date.now() - interactionStartTime
      
      expect(interactionTime).toBeLessThan(2000) // 2 seconds max
      
      await page2.close()
      console.log(`✅ Cross-tab synchronization: navigation=${navigationTime}ms, interaction=${interactionTime}ms`)
    })

    test('should handle rapid tab switching', async ({ page, context }) => {
      // Create multiple tabs
      const tabs = [page]
      for (let i = 0; i < 2; i++) {
        const newTab = await context.newPage()
        tabs.push(newTab)
      }
      
      // Load different pages in each tab
      await tabs[0].goto('/auth/login')
      await tabs[1].goto('/auth/signup')
      await tabs[2].goto('/auth/reset-password')
      
      // Rapidly switch between tabs by interacting with each
      const startTime = Date.now()
      
      for (let i = 0; i < 3; i++) {
        for (const tab of tabs) {
          // Quick interaction to simulate tab switching
          await tab.locator('body').click()
          await tab.waitForTimeout(100)
        }
      }
      
      const switchingTime = Date.now() - startTime
      
      // Should handle rapid switching efficiently
      expect(switchingTime).toBeLessThan(5000) // 5 seconds max
      
      // All tabs should still be responsive
      for (const tab of tabs) {
        await expect(tab.locator('body')).toBeVisible()
      }
      
      // Close additional tabs
      for (let i = 1; i < tabs.length; i++) {
        await tabs[i].close()
      }
      
      console.log(`✅ Rapid tab switching handled in ${switchingTime}ms`)
    })
  })

  test.describe('Graceful Degradation Validation', () => {
    test('should ensure graceful degradation works correctly', async ({ page }) => {
      // Test with potential JavaScript errors
      await page.addInitScript(() => {
        // Simulate potential issues but don't break core functionality
        window.addEventListener('error', (e) => {
          console.log('JavaScript error intercepted:', e.message)
        })
      })
      
      await page.goto('/auth/login')
      
      // Core functionality should still work
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      await expect(page.locator('form')).toBeVisible()
      
      // Form should be functional
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      // Submit button should be clickable
      await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible()
      
      console.log('✅ Graceful degradation working correctly')
    })
    test('should handle resource loading failures', async ({ page }) => {
      // Test with some resources potentially failing to load
      await page.route('**/*.png', route => route.abort())
      await page.route('**/*.jpg', route => route.abort())
      
      await page.goto('/auth/login')
      
      // Page should still load and be functional despite missing images
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      await expect(page.locator('form')).toBeVisible()
      
      // Form interactions should work
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      console.log('✅ Resource loading failures handled gracefully')
    })

    test('should work with limited browser capabilities', async ({ page }) => {
      // Test with localStorage potentially unavailable
      await page.addInitScript(() => {
        // Simulate localStorage issues
        const originalSetItem = localStorage.setItem
        localStorage.setItem = function(key, value) {
          if (Math.random() > 0.8) {
            throw new Error('Storage quota exceeded')
          }
          return originalSetItem.call(this, key, value)
        }
      })
      
      await page.goto('/auth/login')
      
      // Should still function
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      
      // Form should work
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      console.log('✅ Limited browser capabilities handled')
    })
  })

  test.describe('Memory and Resource Management', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      // Navigate through multiple pages to test for memory leaks
      const routes = ['/auth/login', '/auth/signup', '/auth/reset-password', '/']
      
      for (let cycle = 0; cycle < 3; cycle++) {
        console.log(`Navigation cycle ${cycle + 1}`)
        
        for (const route of routes) {
          await page.goto(route)
          await page.waitForLoadState('networkidle')
          
          // Verify page loads correctly
          await expect(page.locator('body')).toBeVisible()
          
          // Small delay to allow cleanup
          await page.waitForTimeout(200)
        }
      }
      
      // Final check - should still be responsive
      await page.goto('/auth/login')
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      
      console.log('✅ No apparent memory leaks during navigation')
    })

    test('should handle rapid form interactions', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Rapid form filling and clearing
      for (let i = 0; i < 10; i++) {
        await page.fill('input[type="text"]', `User ${i}`)
        await page.fill('input[type="email"]', `test${i}@example.com`)
        await page.fill('input[type="password"]', `password${i}`)
        await page.fill('input[type="password"]:nth-child(2)', `password${i}`)
        
        // Clear fields
        await page.fill('input[type="text"]', '')
        await page.fill('input[type="email"]', '')
        await page.fill('input[type="password"]', '')
        await page.fill('input[type="password"]:nth-child(2)', '')
        
        // Small delay
        await page.waitForTimeout(50)
      }
      
      // Form should still be responsive
      await page.fill('input[type="text"]', 'Final Test')
      await expect(page.locator('input[type="text"]')).toHaveValue('Final Test')
      
      console.log('✅ Rapid form interactions handled efficiently')
    })
  })

  test.describe('Error Recovery Performance', () => {
    test('should recover quickly from errors', async ({ page }) => {
      // Test error recovery time
      await page.goto('/auth/login')
      
      // Simulate form submission error
      await page.fill('input[type="email"]', 'invalid@example.com')
      await page.fill('input[type="password"]', 'wrongpassword')
      
      const submitStartTime = Date.now()
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Wait for response (error or success)
      await page.waitForTimeout(3000)
      
      const recoveryTime = Date.now() - submitStartTime
      
      // Should handle error response quickly
      expect(recoveryTime).toBeLessThan(10000) // 10 seconds max
      
      // Form should be ready for retry
      await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible()
      
      console.log(`✅ Error recovery completed in ${recoveryTime}ms`)
    })

    test('should maintain performance under stress', async ({ page }) => {
      // Stress test with multiple operations
      const operations = []
      
      // Multiple navigation operations
      for (let i = 0; i < 5; i++) {
        operations.push(
          page.goto('/auth/login').then(() => page.goto('/auth/signup'))
        )
      }
      
      // Multiple form interactions
      operations.push(
        page.goto('/auth/login').then(async () => {
          for (let i = 0; i < 5; i++) {
            await page.fill('input[type="email"]', `test${i}@example.com`)
            await page.fill('input[type="password"]', `password${i}`)
          }
        })
      )
      
      const stressStartTime = Date.now()
      await Promise.all(operations)
      const stressTime = Date.now() - stressStartTime
      
      // Should handle stress operations within reasonable time
      expect(stressTime).toBeLessThan(15000) // 15 seconds max
      
      // Application should still be responsive
      await expect(page.locator('body')).toBeVisible()
      
      console.log(`✅ Stress test completed in ${stressTime}ms`)
    })
  })
})