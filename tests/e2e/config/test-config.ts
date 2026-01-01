/**
 * E2E Test Configuration for Forma
 * 
 * This file contains configuration settings, test data, and environment-specific
 * settings for end-to-end tests.
 */

export const TEST_CONFIG = {
  // Base URLs for different environments
  baseUrls: {
    local: 'http://127.0.0.1:3000',
    staging: 'https://staging.forma.app',
    production: 'https://app.forma.app'
  },

  // Test timeouts (in milliseconds)
  timeouts: {
    short: 2000,      // For quick operations
    medium: 5000,     // For form submissions
    long: 10000,      // For page loads
    veryLong: 30000   // For complex operations
  },

  // Test user credentials
  testUsers: {
    validUser: {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User'
    },
    adminUser: {
      email: 'admin@example.com',
      password: 'admin123',
      fullName: 'Admin User'
    }
  },

  // Viewport configurations for responsive testing
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1200, height: 800 },
    largeDesktop: { width: 1920, height: 1080 }
  },

  // Form validation test data
  validationTestData: {
    invalidEmails: [
      'invalid-email',
      'test@',
      '@example.com',
      'test.example.com',
      'test@.com'
    ],
    weakPasswords: [
      '123',
      'password',
      'abc',
      '12345678',
      'PASSWORD123'
    ],
    validPasswords: [
      'SecurePass123',
      'MyPassword1',
      'Test123456',
      'ValidPass1'
    ]
  },

  // Performance thresholds
  performance: {
    maxPageLoadTime: 5000,    // 5 seconds
    maxFormSubmitTime: 3000,  // 3 seconds
    maxApiResponseTime: 2000  // 2 seconds
  },

  // Accessibility requirements
  accessibility: {
    requiredElements: [
      'h1',           // Main heading
      'main',         // Main content area
      'nav'           // Navigation
    ],
    requiredAttributes: [
      'alt',          // Image alt text
      'aria-label',   // ARIA labels
      'role'          // ARIA roles
    ]
  },

  // Test data patterns
  patterns: {
    emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    passwordPattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
    namePattern: /^[a-zA-Z\s]{2,50}$/
  },

  // Error messages to test
  expectedErrors: {
    invalidEmail: 'Please enter a valid email address',
    weakPassword: 'Password must be at least 8 characters',
    passwordMismatch: 'Passwords do not match',
    requiredField: 'This field is required',
    userNotFound: 'Invalid email or password',
    emailExists: 'User already exists'
  },

  // Success messages to test
  expectedSuccess: {
    registrationSuccess: 'Registration successful',
    loginSuccess: 'Welcome back',
    passwordResetSent: 'Password reset email sent',
    emailVerified: 'Email verified successfully'
  },

  // Page selectors
  selectors: {
    // Authentication forms
    loginForm: {
      emailInput: 'input[type="email"]',
      passwordInput: 'input[type="password"]',
      rememberMeCheckbox: 'input[type="checkbox"]',
      submitButton: 'button[type="submit"]:has-text("Sign In")',
      forgotPasswordLink: 'a:has-text("Forgot password?")',
      signupLink: 'a:has-text("Create one here")'
    },
    
    signupForm: {
      fullNameInput: 'input[type="text"]',
      emailInput: 'input[type="email"]',
      passwordInput: 'input[type="password"]:first-of-type',
      confirmPasswordInput: 'input[type="password"]:nth-of-type(2)',
      submitButton: 'button[type="submit"]:has-text("Create Account")',
      loginLink: 'button:has-text("Sign in here")'
    },

    resetPasswordForm: {
      emailInput: 'input[type="email"]',
      submitButton: 'button[type="submit"]'
    },

    // Navigation elements
    navigation: {
      logo: 'a:has-text("Forma")',
      dashboardLink: 'a[href="/dashboard"]',
      transactionsLink: 'a[href="/transactions"]',
      reportsLink: 'a[href="/reports"]',
      settingsLink: 'a[href="/settings"]'
    },

    // Dashboard elements
    dashboard: {
      mainHeading: 'h1:has-text("Family Dashboard")',
      comingSoonMessage: 'text=Dashboard Coming Soon'
    },

    // Common UI elements
    common: {
      loadingSpinner: '[data-testid="loading-spinner"]',
      errorMessage: '[role="alert"], .error, .text-red',
      successMessage: '.success, .text-green',
      modal: '[role="dialog"]',
      closeButton: 'button:has-text("Close")'
    }
  },

  // Test environment detection
  getEnvironment(): 'local' | 'staging' | 'production' {
    const url = process.env.BASE_URL || 'http://127.0.0.1:3000'
    
    if (url.includes('127.0.0.1') || url.includes('localhost')) {
      return 'local'
    } else if (url.includes('staging')) {
      return 'staging'
    } else {
      return 'production'
    }
  },

  // Get base URL for current environment
  getBaseUrl(): string {
    const env = this.getEnvironment()
    return process.env.BASE_URL || this.baseUrls[env]
  },

  // Check if running in CI environment
  isCI(): boolean {
    return !!process.env.CI
  },

  // Get test user for current environment
  getTestUser() {
    const env = this.getEnvironment()
    
    if (env === 'production') {
      // Use different test user for production
      return {
        email: 'prod-test@example.com',
        password: 'prodtest123',
        fullName: 'Production Test User'
      }
    }
    
    return this.testUsers.validUser
  }
}

/**
 * Test utilities for common operations
 */
export const TEST_UTILS = {
  /**
   * Generate unique test data
   */
  generateUniqueData() {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    
    return {
      email: `test-${timestamp}-${random}@example.com`,
      fullName: `Test User ${timestamp}`,
      workspaceName: `Test Workspace ${timestamp}`
    }
  },

  /**
   * Wait for a specific amount of time
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  /**
   * Retry an operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          throw lastError
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await this.wait(delay)
      }
    }
    
    throw lastError!
  },

  /**
   * Check if string matches email pattern
   */
  isValidEmail(email: string): boolean {
    return TEST_CONFIG.patterns.emailPattern.test(email)
  },

  /**
   * Check if string matches password pattern
   */
  isValidPassword(password: string): boolean {
    return TEST_CONFIG.patterns.passwordPattern.test(password)
  },

  /**
   * Generate random string
   */
  randomString(length = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return result
  }
}

/**
 * Test data sets for comprehensive testing
 */
export const TEST_DATA_SETS = {
  // Valid form data
  validRegistrationData: [
    {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      password: 'SecurePass123'
    },
    {
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com',
      password: 'MyPassword1'
    },
    {
      fullName: 'Test User',
      email: 'test.user@example.com',
      password: 'TestPass123'
    }
  ],

  // Invalid form data for validation testing
  invalidRegistrationData: [
    {
      fullName: '',
      email: 'invalid-email',
      password: 'weak',
      expectedErrors: ['Full name is required', 'Invalid email', 'Password too weak']
    },
    {
      fullName: 'A',
      email: 'test@',
      password: '12345678',
      expectedErrors: ['Name too short', 'Invalid email', 'Password needs letters']
    }
  ],

  // Browser and device combinations for cross-browser testing
  browserConfigs: [
    { name: 'Chrome Desktop', viewport: TEST_CONFIG.viewports.desktop },
    { name: 'Chrome Mobile', viewport: TEST_CONFIG.viewports.mobile },
    { name: 'Firefox Desktop', viewport: TEST_CONFIG.viewports.desktop },
    { name: 'Safari Mobile', viewport: TEST_CONFIG.viewports.mobile }
  ]
}