/**
 * Tests for TransactionStatusBadge component
 * Validates visual distinction for planned vs completed transactions
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransactionStatusBadge } from '@/components/transactions/transaction-status-badge'

describe('TransactionStatusBadge', () => {
  describe('Planned Status', () => {
    it('renders planned badge with correct styling', () => {
      const { container } = render(<TransactionStatusBadge status="planned" />)
      
      const badge = screen.getByText('Planned')
      expect(badge).toBeInTheDocument()
      
      // Check that badge is rendered as a span with proper classes
      const badgeElement = container.querySelector('span')
      expect(badgeElement).toBeInTheDocument()
      expect(badgeElement?.className).toContain('rounded-full')
      expect(badgeElement?.className).toContain('font-medium')
    })
    
    it('shows calendar clock icon for planned status', () => {
      const { container } = render(<TransactionStatusBadge status="planned" />)
      
      // Icon should be present
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
    
    it('hides icon when showIcon is false', () => {
      const { container } = render(
        <TransactionStatusBadge status="planned" showIcon={false} />
      )
      
      const icon = container.querySelector('svg')
      expect(icon).not.toBeInTheDocument()
    })
  })
  
  describe('Completed Status', () => {
    it('renders completed badge with correct styling', () => {
      const { container } = render(<TransactionStatusBadge status="completed" />)
      
      const badge = screen.getByText('Completed')
      expect(badge).toBeInTheDocument()
      
      // Check that badge is rendered with proper structure
      const badgeElement = container.querySelector('span')
      expect(badgeElement).toBeInTheDocument()
      expect(badgeElement?.className).toContain('rounded-full')
      expect(badgeElement?.className).toContain('font-medium')
    })
    
    it('shows check circle icon for completed status', () => {
      const { container } = render(<TransactionStatusBadge status="completed" />)
      
      // Icon should be present
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })
  
  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      const { container } = render(
        <TransactionStatusBadge status="planned" size="sm" />
      )
      
      const badge = container.querySelector('span')
      expect(badge?.className).toContain('px-2')
      expect(badge?.className).toContain('py-0.5')
      expect(badge?.className).toContain('text-xs')
    })
    
    it('renders medium size correctly', () => {
      const { container } = render(
        <TransactionStatusBadge status="planned" size="md" />
      )
      
      const badge = container.querySelector('span')
      expect(badge?.className).toContain('px-3')
      expect(badge?.className).toContain('py-1')
      expect(badge?.className).toContain('text-xs')
    })
    
    it('renders large size correctly', () => {
      const { container } = render(
        <TransactionStatusBadge status="planned" size="lg" />
      )
      
      const badge = container.querySelector('span')
      expect(badge?.className).toContain('px-4')
      expect(badge?.className).toContain('py-1.5')
      expect(badge?.className).toContain('text-sm')
    })
  })
  
  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      const { container } = render(<TransactionStatusBadge status="planned" />)
      
      const badge = container.querySelector('span')
      expect(badge).toBeInTheDocument()
      expect(badge?.tagName).toBe('SPAN')
    })
    
    it('applies custom className', () => {
      const { container } = render(
        <TransactionStatusBadge status="planned" className="custom-class" />
      )
      
      const badge = container.querySelector('span')
      expect(badge?.className).toContain('custom-class')
    })
  })
})
