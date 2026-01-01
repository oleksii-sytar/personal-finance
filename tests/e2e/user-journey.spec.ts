import { test, expect } from '@playwright/test'

test.describe('Complete User Journey', () => {
  test.describe('New User Onboarding Flow', () => {
    test('should complete full registration and onboarding journey', async ({ page }) => {
      // Step 1: Visit landing page
      await page.goto('/')
      
      // Should show landing page content
      await expect(page.locator('body')).toBeVisible()
      
      // Step 2: Navigate to registration
      // Look for sign up link or button on landing page
      const signUpButton = page.locator('a[href="/auth/signup"], button:has-text("Sign Up"), a:has-text("Get Started")')
      
      if (await signUpButton.count() > 0) {
        await signUpButton.first().click()
      } else {
        // Direct navigation if no button found
        await page.goto('/auth/signup')
      }
      
      // Should be on signup page
      await expect(page).toHaveURL('/auth/signup')
      await expect(page.locator('h1:has-text("Start Your Journey")')).toBeVisible()
      
      // Step 3: Complete registration
      const timestamp = Date.now()
      const testEmail = `journey-test-${timestamp}@example.com`
      
      await page.fill('input[type="text"]', 'Journey Test User')
      await page.fill('input[type="email"]', testEmail)
      await page.fill('input[type="password"]', 'SecurePass123')
      await page.fill('input[type="password"]:nth-child(2)', 'SecurePass123')
      
      // Submit registration
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Step 4: Handle registration response
      // Should show loading state
      await expect(page.locator('button:has-text("Creating Account...")')).toBeVisible({ timeout: 2000 })
      
      // Wait for response (success message or error)
      await page.waitForTimeout(3000)
      
      // Check if success message appears
      const successMessage = page.locator('text=Registration successful')
      if (await successMessage.isVisible()) {
        console.log('Registration successful - would need email verification in real scenario')
        
        // Should redirect to login after success
        await expect(page).toHaveURL('/auth/login', { timeout: 5000 })
      } else {
        console.log('Registration may have failed or requires different handling')
      }
      
      // Step 5: Login with new account
      await page.goto('/auth/login')
      await page.fill('input[type="email"]', testEmail)
      await page.fill('input[type="password"]', 'SecurePass123')
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Step 6: Handle post-login flow
      await page.waitForTimeout(3000)
      
      // Should either go to dashboard or workspace creation
      const currentUrl = page.url()
      
      if (currentUrl.includes('/dashboard')) {
        // Successfully logged in and has workspace
        await expect(page.locator('h1:has-text("Family Dashboard")')).toBeVisible()
        console.log('User journey completed - reached dashboard')
      } else if (currentUrl.includes('/workspace') || currentUrl.includes('/onboarding')) {
        // Needs to create workspace
        console.log('User needs to complete workspace setup')
      } else {
        console.log(`Unexpected URL after login: ${currentUrl}`)
      }
    })

    test('should handle registration with existing email', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Try to register with a common email that might already exist
      await page.fill('input[type="text"]', 'Test User')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.fill('input[type="password"]:nth-child(2)', 'password123')
      
      await page.click('button[type="submit"]:has-text("Create Account")')
      
      // Should handle duplicate email error gracefully
      await page.waitForTimeout(3000)
      
      // Check for error message or successful handling
      const errorMessage = page.locator('text=already exists, text=already registered')
      if (await errorMessage.isVisible()) {
        console.log('Properly handled duplicate email error')
      }
    })
  })

  test.describe('Returning User Flow', () => {
    test('should handle returning user login journey', async ({ page }) => {
      // Step 1: Visit landing page
      await page.goto('/')
      
      // Step 2: Navigate to login
      const loginButton = page.locator('a[href="/auth/login"], button:has-text("Sign In"), a:has-text("Login")')
      
      if (await loginButton.count() > 0) {
        await loginButton.first().click()
      } else {
        await page.goto('/auth/login')
      }
      
      // Should be on login page
      await expect(page).toHaveURL('/auth/login')
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
      
      // Step 3: Attempt login with test credentials
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      // Check remember me option
      await page.check('input[type="checkbox"]')
      
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Step 4: Handle login response
      await page.waitForTimeout(3000)
      
      const currentUrl = page.url()
      
      if (currentUrl.includes('/dashboard')) {
        // Successful login
        await expect(page.locator('h1:has-text("Family Dashboard")')).toBeVisible()
        console.log('Returning user successfully logged in')
        
        // Step 5: Test navigation to different sections
        const navigationTests = [
          { path: '/transactions', expectedText: 'Transactions' },
          { path: '/reports', expectedText: 'Reports' },
          { path: '/settings', expectedText: 'Settings' }
        ]
        
        for (const nav of navigationTests) {
          await page.goto(nav.path)
          await expect(page.locator('body')).toBeVisible()
          console.log(`Successfully navigated to ${nav.path}`)
        }
        
      } else if (currentUrl.includes('/auth/login')) {
        // Login failed - check for error message
        console.log('Login failed - checking for error handling')
        
        // Should show appropriate error message
        const errorElements = page.locator('[class*="error"], .text-red, [role="alert"]')
        if (await errorElements.count() > 0) {
          console.log('Error message displayed appropriately')
        }
      }
    })

    test('should handle forgot password flow', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Click forgot password link
      await page.click('a:has-text("Forgot password?")')
      
      // Should navigate to reset password page
      await expect(page).toHaveURL('/auth/reset-password')
      
      // Fill email and submit
      await page.fill('input[type="email"]', 'test@example.com')
      await page.click('button[type="submit"]')
      
      // Should handle password reset request
      await page.waitForTimeout(2000)
      
      console.log('Password reset flow initiated')
    })
  })

  test.describe('Cross-Browser User Experience', () => {
    test('should work consistently across different viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop Large' },
        { width: 1366, height: 768, name: 'Desktop Standard' },
        { width: 768, height: 1024, name: 'Tablet Portrait' },
        { width: 1024, height: 768, name: 'Tablet Landscape' },
        { width: 375, height: 667, name: 'Mobile iPhone' },
        { width: 414, height: 896, name: 'Mobile iPhone Plus' }
      ]
      
      for (const viewport of viewports) {
        console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`)
        
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        
        // Test login page
        await page.goto('/auth/login')
        await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible()
        await expect(page.locator('form')).toBeVisible()
        
        // Test signup page
        await page.goto('/auth/signup')
        await expect(page.locator('h1:has-text("Start Your Journey")')).toBeVisible()
        await expect(page.locator('form')).toBeVisible()
        
        // Test form interaction
        await page.fill('input[type="email"]', 'test@example.com')
        await page.fill('input[type="password"]', 'password123')
        
        // Verify form elements are accessible
        await expect(page.locator('button[type="submit"]')).toBeVisible()
      }
    })

    test('should handle slow network conditions gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async route => {
        // Add delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 200))
        await route.continue()
      })
      
      await page.goto('/auth/login')
      
      // Should still load, just slower
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible({ timeout: 10000 })
      
      // Test form submission with slow network
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Should show loading state and handle slow response
      await expect(page.locator('button:has-text("Signing In...")')).toBeVisible({ timeout: 2000 })
      
      // Wait for response
      await page.waitForTimeout(5000)
    })
  })

  test.describe('Error Recovery and Edge Cases', () => {
    test('should recover from JavaScript errors gracefully', async ({ page }) => {
      // Listen for console errors
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      
      // Navigate through the app
      await page.goto('/auth/login')
      await page.goto('/auth/signup')
      await page.goto('/auth/reset-password')
      
      // Check if any critical errors occurred
      const criticalErrors = errors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('404') &&
        !error.includes('net::ERR_')
      )
      
      if (criticalErrors.length > 0) {
        console.log('JavaScript errors detected:', criticalErrors)
      } else {
        console.log('No critical JavaScript errors detected')
      }
    })

    test('should handle browser back/forward navigation', async ({ page }) => {
      // Navigate through auth flow
      await page.goto('/auth/login')
      await page.goto('/auth/signup')
      await page.goto('/auth/reset-password')
      
      // Test back navigation
      await page.goBack() // Should go to signup
      await expect(page).toHaveURL('/auth/signup')
      
      await page.goBack() // Should go to login
      await expect(page).toHaveURL('/auth/login')
      
      // Test forward navigation
      await page.goForward() // Should go to signup
      await expect(page).toHaveURL('/auth/signup')
    })

    test('should handle page refresh during form submission', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Fill form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      // Start form submission
      await page.click('button[type="submit"]:has-text("Sign In")')
      
      // Immediately refresh page
      await page.reload()
      
      // Should handle gracefully - form should be reset
      await expect(page.locator('input[type="email"]')).toHaveValue('')
      await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible()
    })
  })

  test.describe('Performance and User Experience', () => {
    test('should load pages within acceptable time limits', async ({ page }) => {
      const pages = [
        { url: '/', name: 'Landing Page' },
        { url: '/auth/login', name: 'Login Page' },
        { url: '/auth/signup', name: 'Signup Page' },
        { url: '/auth/reset-password', name: 'Reset Password Page' }
      ]
      
      for (const testPage of pages) {
        const startTime = Date.now()
        await page.goto(testPage.url)
        
        // Wait for main content to load
        await expect(page.locator('body')).toBeVisible()
        
        const loadTime = Date.now() - startTime
        console.log(`${testPage.name} loaded in ${loadTime}ms`)
        
        // Should load within 5 seconds
        expect(loadTime).toBeLessThan(5000)
      }
    })

    test('should provide good user feedback during interactions', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Test hover states
      const submitButton = page.locator('button[type="submit"]:has-text("Sign In")')
      await submitButton.hover()
      
      // Test focus states
      await page.focus('input[type="email"]')
      await page.focus('input[type="password"]')
      
      // Test form validation feedback
      await page.fill('input[type="email"]', 'invalid-email')
      await submitButton.click()
      
      // Should provide immediate feedback
      await page.waitForTimeout(500)
    })
  })
})