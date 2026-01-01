import { Page, expect } from '@playwright/test'

/**
 * Test helper utilities for E2E tests
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login a user with email and password
   */
  async loginUser(email = 'test@example.com', password = 'password123') {
    await this.page.goto('/auth/login')
    await this.page.fill('input[type="email"]', email)
    await this.page.fill('input[type="password"]', password)
    await this.page.click('button[type="submit"]:has-text("Sign In")')
    
    // Wait for potential redirect or error handling
    await this.page.waitForTimeout(2000)
    
    return this.page.url()
  }

  /**
   * Register a new user
   */
  async registerUser(
    fullName = 'Test User',
    email?: string,
    password = 'SecurePass123'
  ) {
    const testEmail = email || `test-${Date.now()}@example.com`
    
    await this.page.goto('/auth/signup')
    await this.page.fill('input[type="text"]', fullName)
    await this.page.fill('input[type="email"]', testEmail)
    await this.page.fill('input[type="password"]', password)
    await this.page.fill('input[type="password"]:nth-child(2)', password)
    await this.page.click('button[type="submit"]:has-text("Create Account")')
    
    // Wait for response
    await this.page.waitForTimeout(3000)
    
    return { email: testEmail, password, fullName }
  }

  /**
   * Check if user is authenticated by trying to access dashboard
   */
  async isAuthenticated(): Promise<boolean> {
    await this.page.goto('/dashboard')
    await this.page.waitForTimeout(1000)
    
    const currentUrl = this.page.url()
    return !currentUrl.includes('/auth/login')
  }

  /**
   * Logout user by clearing session storage
   */
  async logoutUser() {
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // Navigate to a protected route to trigger redirect
    await this.page.goto('/dashboard')
    await this.page.waitForTimeout(1000)
  }

  /**
   * Wait for element to be visible with custom timeout
   */
  async waitForElement(selector: string, timeout = 5000) {
    await expect(this.page.locator(selector)).toBeVisible({ timeout })
  }

  /**
   * Fill form fields from an object
   */
  async fillForm(fields: Record<string, string>) {
    for (const [selector, value] of Object.entries(fields)) {
      await this.page.fill(selector, value)
    }
  }

  /**
   * Check form validation by submitting empty form
   */
  async checkFormValidation(submitButtonText: string) {
    await this.page.click(`button[type="submit"]:has-text("${submitButtonText}")`)
    
    // Check if required fields are marked as such
    const requiredInputs = await this.page.locator('input[required]').count()
    return requiredInputs > 0
  }

  /**
   * Test responsive design across different viewports
   */
  async testResponsiveDesign(elementSelector: string) {
    const viewports = [
      { width: 1200, height: 800, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ]

    const results: Array<{ viewport: string; visible: boolean }> = []

    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      const isVisible = await this.page.locator(elementSelector).isVisible()
      results.push({ viewport: viewport.name, visible: isVisible })
    }

    return results
  }

  /**
   * Simulate slow network conditions
   */
  async simulateSlowNetwork(delayMs = 200) {
    await this.page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      await route.continue()
    })
  }

  /**
   * Simulate offline condition
   */
  async simulateOffline() {
    await this.page.context().setOffline(true)
  }

  /**
   * Restore online condition
   */
  async restoreOnline() {
    await this.page.context().setOffline(false)
  }

  /**
   * Check for JavaScript errors on the page
   */
  async collectJavaScriptErrors(): Promise<string[]> {
    const errors: string[] = []
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    this.page.on('pageerror', error => {
      errors.push(error.message)
    })

    return errors
  }

  /**
   * Measure page load time
   */
  async measurePageLoadTime(url: string): Promise<number> {
    const startTime = Date.now()
    await this.page.goto(url)
    await this.page.waitForLoadState('networkidle')
    return Date.now() - startTime
  }

  /**
   * Check accessibility by looking for basic ARIA attributes
   */
  async checkBasicAccessibility() {
    const results = {
      hasMainHeading: await this.page.locator('h1').count() > 0,
      hasMainLandmark: await this.page.locator('main').count() > 0,
      imagesHaveAlt: true,
      formsHaveLabels: true
    }

    // Check images have alt text
    const images = this.page.locator('img')
    const imageCount = await images.count()
    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt')
      if (!alt) {
        results.imagesHaveAlt = false
        break
      }
    }

    // Check form inputs have labels
    const inputs = this.page.locator('input[type="text"], input[type="email"], input[type="password"]')
    const inputCount = await inputs.count()
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const hasLabel = id ? await this.page.locator(`label[for="${id}"]`).count() > 0 : false
      const hasAriaLabel = await input.getAttribute('aria-label')
      
      if (!hasLabel && !hasAriaLabel) {
        results.formsHaveLabels = false
        break
      }
    }

    return results
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Test tab navigation
    await this.page.keyboard.press('Tab')
    const firstFocused = await this.page.evaluate(() => document.activeElement?.tagName)
    
    await this.page.keyboard.press('Tab')
    const secondFocused = await this.page.evaluate(() => document.activeElement?.tagName)
    
    return {
      canNavigate: firstFocused !== secondFocused,
      firstElement: firstFocused,
      secondElement: secondFocused
    }
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoadingComplete(loadingSelector = 'button:has-text("...")', timeout = 10000) {
    try {
      // Wait for loading indicator to appear
      await expect(this.page.locator(loadingSelector)).toBeVisible({ timeout: 2000 })
      
      // Wait for loading indicator to disappear
      await expect(this.page.locator(loadingSelector)).not.toBeVisible({ timeout })
    } catch (error) {
      // Loading indicator might not appear for fast operations
      console.log('Loading indicator not detected or completed quickly')
    }
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${name}-${timestamp}.png`
    
    await this.page.screenshot({ 
      path: `test-results/screenshots/${filename}`,
      fullPage: true 
    })
    
    return filename
  }

  /**
   * Verify page has no console errors
   */
  async verifyNoConsoleErrors() {
    const errors = await this.collectJavaScriptErrors()
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('net::ERR_') &&
      !error.includes('chrome-extension')
    )
    
    return {
      hasErrors: criticalErrors.length > 0,
      errors: criticalErrors
    }
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate unique email for testing
   */
  static generateEmail(prefix = 'test'): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `${prefix}-${timestamp}-${random}@example.com`
  }

  /**
   * Generate test user data
   */
  static generateUser() {
    const timestamp = Date.now()
    return {
      fullName: `Test User ${timestamp}`,
      email: this.generateEmail(),
      password: 'SecurePass123'
    }
  }

  /**
   * Generate workspace data
   */
  static generateWorkspace() {
    const timestamp = Date.now()
    return {
      name: `Test Workspace ${timestamp}`,
      description: `Test workspace created at ${new Date().toISOString()}`
    }
  }
}

/**
 * Common assertions for Forma app
 */
export class FormaAssertions {
  constructor(private page: Page) {}

  /**
   * Assert user is on login page
   */
  async assertOnLoginPage() {
    await expect(this.page).toHaveURL(/\/auth\/login/)
    await expect(this.page.locator('h1:has-text("Welcome Back")')).toBeVisible()
  }

  /**
   * Assert user is on signup page
   */
  async assertOnSignupPage() {
    await expect(this.page).toHaveURL(/\/auth\/signup/)
    await expect(this.page.locator('h1:has-text("Start Your Journey")')).toBeVisible()
  }

  /**
   * Assert user is on dashboard
   */
  async assertOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/)
    await expect(this.page.locator('h1:has-text("Family Dashboard")')).toBeVisible()
  }

  /**
   * Assert form has validation errors
   */
  async assertFormHasValidationErrors() {
    const errorElements = this.page.locator('[class*="error"], .text-red, [role="alert"]')
    await expect(errorElements.first()).toBeVisible({ timeout: 5000 })
  }

  /**
   * Assert loading state is shown
   */
  async assertLoadingState(buttonText: string) {
    await expect(this.page.locator(`button:has-text("${buttonText}")`)).toBeVisible({ timeout: 2000 })
  }

  /**
   * Assert Forma branding is present
   */
  async assertFormaBranding() {
    await expect(this.page.locator('text=Forma')).toBeVisible()
  }
}