/**
 * Tests for MarkAsPaidButton component
 * Validates "Mark as Paid" action for planned transactions
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MarkAsPaidButton } from '@/components/transactions/mark-as-paid-button'

describe('MarkAsPaidButton', () => {
  describe('Default Variant', () => {
    it('renders button with correct text', () => {
      render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={vi.fn()}
        />
      )
      
      expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
    })
    
    it('shows check circle icon', () => {
      const { container } = render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={vi.fn()}
        />
      )
      
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
    
    it('has success color styling', () => {
      const { container } = render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={vi.fn()}
        />
      )
      
      const button = container.querySelector('button')
      expect(button?.className).toContain('bg-[var(--accent-success)]')
    })
  })
  
  describe('Compact Variant', () => {
    it('renders compact button', () => {
      const { container } = render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={vi.fn()}
          variant="compact"
        />
      )
      
      const button = container.querySelector('button')
      expect(button?.className).toContain('rounded-full')
      expect(button?.className).toContain('text-xs')
    })
    
    it('shows text and icon in compact mode', () => {
      const { container } = render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={vi.fn()}
          variant="compact"
        />
      )
      
      expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })
  
  describe('Interaction', () => {
    it('calls onMarkAsPaid when clicked', async () => {
      const onMarkAsPaid = vi.fn().mockResolvedValue(undefined)
      render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={onMarkAsPaid}
        />
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(onMarkAsPaid).toHaveBeenCalledWith('test-id')
      })
    })
    
    it('stops event propagation', async () => {
      const onMarkAsPaid = vi.fn().mockResolvedValue(undefined)
      const parentClick = vi.fn()
      
      const { container } = render(
        <div onClick={parentClick}>
          <MarkAsPaidButton
            transactionId="test-id"
            onMarkAsPaid={onMarkAsPaid}
          />
        </div>
      )
      
      const button = container.querySelector('button')!
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(onMarkAsPaid).toHaveBeenCalled()
      })
      expect(parentClick).not.toHaveBeenCalled()
    })
    
    it('does not call handler when disabled', () => {
      const onMarkAsPaid = vi.fn()
      render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={onMarkAsPaid}
          disabled
        />
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(onMarkAsPaid).not.toHaveBeenCalled()
    })
  })
  
  describe('Loading State', () => {
    it('shows loading spinner during async operation', async () => {
      let resolvePromise: () => void
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      const onMarkAsPaid = vi.fn().mockReturnValue(promise)
      
      render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={onMarkAsPaid}
        />
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Marking...')).toBeInTheDocument()
      })
      
      // Resolve the promise
      resolvePromise!()
      
      // Should return to normal state
      await waitFor(() => {
        expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
      })
    })
    
    it('disables button during loading', async () => {
      let resolvePromise: () => void
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      const onMarkAsPaid = vi.fn().mockReturnValue(promise)
      
      render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={onMarkAsPaid}
        />
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(button).toBeDisabled()
      })
      
      resolvePromise!()
    })
    
    it('shows loading spinner in compact variant', async () => {
      let resolvePromise: () => void
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      const onMarkAsPaid = vi.fn().mockReturnValue(promise)
      
      const { container } = render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={onMarkAsPaid}
          variant="compact"
        />
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      // Should show loading spinner
      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin')
        expect(spinner).toBeInTheDocument()
      })
      
      resolvePromise!()
    })
  })
  
  describe('Error Handling', () => {
    it('handles errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onMarkAsPaid = vi.fn().mockRejectedValue(new Error('Test error'))
      
      render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={onMarkAsPaid}
        />
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to mark transaction as paid:',
          expect.any(Error)
        )
      })
      
      // Button should return to normal state
      expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
      
      consoleError.mockRestore()
    })
  })
  
  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={vi.fn()}
        />
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Mark transaction as paid')
    })
    
    it('has focus styles', () => {
      const { container } = render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={vi.fn()}
          variant="compact"
        />
      )
      
      const button = container.querySelector('button')
      expect(button?.className).toContain('focus:outline-none')
      expect(button?.className).toContain('focus:ring-2')
    })
    
    it('applies custom className', () => {
      const { container } = render(
        <MarkAsPaidButton
          transactionId="test-id"
          onMarkAsPaid={vi.fn()}
          className="custom-class"
        />
      )
      
      const button = container.querySelector('button')
      expect(button?.className).toContain('custom-class')
    })
  })
})
