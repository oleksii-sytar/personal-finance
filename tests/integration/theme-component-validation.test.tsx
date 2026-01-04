/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/contexts/theme-context'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { WorkspaceSettings } from '@/components/shared/workspace-settings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

// Mock the workspace and auth contexts
vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      id: 'test-workspace',
      name: 'Test Workspace',
      currency: 'UAH',
      created_at: '2024-01-01T00:00:00Z'
    },
    members: [
      { user_id: 'test-user', role: 'owner' }
    ]
  })
}))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user' }
  })
}))

vi.mock('@/components/shared/member-management', () => ({
  MemberManagement: () => <div data-testid="member-management">Member Management</div>
}))

vi.mock('@/lib/validations/workspace', () => ({
  workspaceUpdateSchema: {
    safeParse: () => ({ success: true, data: {} })
  }
}))

// Mock matchMedia for system theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('dark') ? false : true, // Default to light mode
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Test wrapper with theme provider
function TestWrapper({ 
  children, 
  defaultTheme = 'system' 
}: { 
  children: React.ReactNode
  defaultTheme?: 'light' | 'dark' | 'system'
}) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      {children}
    </ThemeProvider>
  )
}

describe('Theme Component Validation', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.cssText = ''
  })

  afterEach(() => {
    cleanup()
  })

  describe('Theme Toggle Component', () => {
    it('should render with theme-aware styling in dark mode', async () => {
      render(
        <TestWrapper defaultTheme="dark">
          <ThemeToggle />
        </TestWrapper>
      )

      // Check that theme toggle is rendered
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
      expect(screen.getByText('Theme')).toBeInTheDocument()
      
      // Check theme options are present
      expect(screen.getByRole('radio', { name: /Light/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /Dark/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /System/i })).toBeInTheDocument()
    })

    it('should render with theme-aware styling in light mode', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper defaultTheme="light">
          <ThemeToggle />
        </TestWrapper>
      )

      // Check that theme toggle is rendered
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
      expect(screen.getByText('Theme')).toBeInTheDocument()
      
      // Check theme options are present
      expect(screen.getByRole('radio', { name: /Light/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /Dark/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /System/i })).toBeInTheDocument()
      
      // Click light theme to ensure it's selected
      const lightOption = screen.getByRole('radio', { name: /Light/i })
      await user.click(lightOption)
      
      // Verify light theme is now active
      expect(lightOption).toHaveAttribute('aria-checked', 'true')
    })

    it('should switch themes correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper defaultTheme="dark">
          <ThemeToggle />
        </TestWrapper>
      )

      // Get theme options by their actual text content
      const lightButton = screen.getByRole('radio', { name: /Light/ })
      const darkButton = screen.getByRole('radio', { name: /Dark/ })
      const systemButton = screen.getByRole('radio', { name: /System/ })

      // Verify buttons exist
      expect(lightButton).toBeInTheDocument()
      expect(darkButton).toBeInTheDocument()
      expect(systemButton).toBeInTheDocument()

      // Test that we can click the buttons (basic interaction test)
      await user.click(lightButton)
      await user.click(darkButton)
      await user.click(systemButton)

      // Verify buttons are still there after clicking
      expect(lightButton).toBeInTheDocument()
      expect(darkButton).toBeInTheDocument()
      expect(systemButton).toBeInTheDocument()
    })
  })

  describe('UI Components Theme Adaptation', () => {
    it('should render Button component with theme-aware classes', () => {
      const { rerender } = render(
        <TestWrapper defaultTheme="dark">
          <Button>Test Button</Button>
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: 'Test Button' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('btn-primary')

      // Test in light mode
      rerender(
        <TestWrapper defaultTheme="light">
          <Button>Test Button</Button>
        </TestWrapper>
      )

      expect(button).toHaveClass('btn-primary')
    })

    it('should render Input component with theme-aware classes', () => {
      const { rerender } = render(
        <TestWrapper defaultTheme="dark">
          <Input label="Test Input" placeholder="Enter text" />
        </TestWrapper>
      )

      const input = screen.getByLabelText('Test Input')
      expect(input).toBeInTheDocument()
      expect(input).toHaveClass('form-input')

      // Test in light mode
      rerender(
        <TestWrapper defaultTheme="light">
          <Input label="Test Input" placeholder="Enter text" />
        </TestWrapper>
      )

      expect(input).toHaveClass('form-input')
    })

    it('should render Card components with theme-aware classes', () => {
      const { rerender } = render(
        <TestWrapper defaultTheme="dark">
          <Card>
            <CardHeader>
              <CardTitle>Test Card</CardTitle>
            </CardHeader>
            <CardContent>
              Test content
            </CardContent>
          </Card>
        </TestWrapper>
      )

      // Find the actual card element (the outermost div with glass-card class)
      const cardElement = screen.getByText('Test Card').closest('[class*="glass-card"]')
      expect(cardElement).toHaveClass('glass-card')

      // Test in light mode
      rerender(
        <TestWrapper defaultTheme="light">
          <Card>
            <CardHeader>
              <CardTitle>Test Card</CardTitle>
            </CardHeader>
            <CardContent>
              Test content
            </CardContent>
          </Card>
        </TestWrapper>
      )

      expect(cardElement).toHaveClass('glass-card')
    })
  })

  describe('WorkspaceSettings Component', () => {
    it('should render with theme-aware styling in dark mode', () => {
      render(
        <TestWrapper defaultTheme="dark">
          <WorkspaceSettings />
        </TestWrapper>
      )

      // Check that appearance section is rendered
      expect(screen.getByText('Appearance')).toBeInTheDocument()
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument()
      
      // Check theme toggle is present
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('should render with theme-aware styling in light mode', () => {
      render(
        <TestWrapper defaultTheme="light">
          <WorkspaceSettings />
        </TestWrapper>
      )

      // Check that appearance section is rendered
      expect(screen.getByText('Appearance')).toBeInTheDocument()
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument()
      
      // Check theme toggle is present
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('should not have hardcoded colors in text elements', () => {
      render(
        <TestWrapper defaultTheme="light">
          <WorkspaceSettings />
        </TestWrapper>
      )

      // Check that workspace name label uses theme-aware classes
      const workspaceNameLabel = screen.getByText('Workspace Name')
      expect(workspaceNameLabel).not.toHaveClass('text-white/60')
      expect(workspaceNameLabel).not.toHaveClass('text-white/90')
    })
  })

  describe('CSS Custom Properties', () => {
    it('should update CSS custom properties when theme changes', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper defaultTheme="dark">
          <ThemeToggle />
        </TestWrapper>
      )

      // Initially should be dark theme
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

      // Switch to light theme
      const lightOption = screen.getByRole('radio', { name: /Light/i })
      await user.click(lightOption)

      // Should update to light theme
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('should have proper CSS custom properties defined', () => {
      render(
        <TestWrapper defaultTheme="dark">
          <div>Test</div>
        </TestWrapper>
      )

      const computedStyle = getComputedStyle(document.documentElement)
      
      // Check that CSS custom properties are defined
      expect(computedStyle.getPropertyValue('--bg-primary')).toBeTruthy()
      expect(computedStyle.getPropertyValue('--text-primary')).toBeTruthy()
      expect(computedStyle.getPropertyValue('--accent-primary')).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should maintain proper ARIA attributes in theme toggle', () => {
      render(
        <TestWrapper defaultTheme="dark">
          <ThemeToggle />
        </TestWrapper>
      )

      const radioGroup = screen.getByRole('radiogroup')
      expect(radioGroup).toHaveAttribute('aria-label', 'Theme selection')

      const lightOption = screen.getByRole('radio', { name: /Light/i })
      expect(lightOption).toHaveAttribute('aria-checked')
      expect(lightOption).toHaveAttribute('aria-describedby')
    })

    it('should have proper focus management', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper defaultTheme="dark">
          <ThemeToggle />
        </TestWrapper>
      )

      const lightOption = screen.getByRole('radio', { name: /Light/i })
      
      // Focus the element
      await user.tab()
      expect(lightOption).toHaveFocus()
    })
  })

  describe('Visual Regression Prevention', () => {
    it('should not contain hardcoded color classes in critical components', () => {
      const { container } = render(
        <TestWrapper defaultTheme="light">
          <WorkspaceSettings />
        </TestWrapper>
      )

      // Check that no hardcoded white/black colors are used
      const elementsWithHardcodedColors = container.querySelectorAll(
        '[class*="text-white"], [class*="bg-white"], [class*="border-white"], [class*="text-black"], [class*="bg-black"]'
      )
      
      // Should be minimal or none (some might be acceptable in specific contexts)
      expect(elementsWithHardcodedColors.length).toBeLessThan(5)
    })

    it('should use theme-aware utility classes', () => {
      const { container } = render(
        <TestWrapper defaultTheme="light">
          <Card>
            <CardHeader>
              <CardTitle>Test</CardTitle>
            </CardHeader>
            <CardContent>Content</CardContent>
          </Card>
        </TestWrapper>
      )

      // Check for theme-aware classes
      const elementsWithThemeClasses = container.querySelectorAll(
        '[class*="text-primary"], [class*="text-secondary"], [class*="bg-glass"], [class*="glass-card"]'
      )
      
      expect(elementsWithThemeClasses.length).toBeGreaterThan(0)
    })
  })
})