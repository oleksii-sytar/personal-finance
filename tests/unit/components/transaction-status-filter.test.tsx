/**
 * Tests for TransactionStatusFilter component
 * Validates filter controls for planned vs completed transactions
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TransactionStatusFilter } from '@/components/transactions/transaction-status-filter'

describe('TransactionStatusFilter', () => {
  describe('Rendering', () => {
    it('renders all filter options', () => {
      const onChange = vi.fn()
      render(<TransactionStatusFilter value="all" onChange={onChange} />)
      
      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Planned')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
    
    it('shows status label', () => {
      const onChange = vi.fn()
      render(<TransactionStatusFilter value="all" onChange={onChange} />)
      
      expect(screen.getByText('Status:')).toBeInTheDocument()
    })
    
    it('displays counts when provided', () => {
      const onChange = vi.fn()
      render(
        <TransactionStatusFilter
          value="all"
          onChange={onChange}
          plannedCount={5}
          completedCount={10}
        />
      )
      
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })
  })
  
  describe('Active State', () => {
    it('highlights active filter option', () => {
      const onChange = vi.fn()
      render(<TransactionStatusFilter value="planned" onChange={onChange} />)
      
      const plannedButton = screen.getByRole('button', { pressed: true })
      expect(plannedButton).toHaveTextContent('Planned')
      expect(plannedButton.className).toContain('bg-[var(--accent-primary)]')
    })
    
    it('shows all as active by default', () => {
      const onChange = vi.fn()
      render(<TransactionStatusFilter value="all" onChange={onChange} />)
      
      const allButton = screen.getByRole('button', { name: /all/i, pressed: true })
      expect(allButton).toBeInTheDocument()
    })
  })
  
  describe('Interaction', () => {
    it('calls onChange when clicking filter option', () => {
      const onChange = vi.fn()
      render(<TransactionStatusFilter value="all" onChange={onChange} />)
      
      const plannedButton = screen.getByText('Planned').closest('button')
      fireEvent.click(plannedButton!)
      
      expect(onChange).toHaveBeenCalledWith('planned')
    })
    
    it('calls onChange with completed status', () => {
      const onChange = vi.fn()
      render(<TransactionStatusFilter value="all" onChange={onChange} />)
      
      const completedButton = screen.getByText('Completed').closest('button')
      fireEvent.click(completedButton!)
      
      expect(onChange).toHaveBeenCalledWith('completed')
    })
    
    it('calls onChange with all status', () => {
      const onChange = vi.fn()
      render(<TransactionStatusFilter value="planned" onChange={onChange} />)
      
      const allButton = screen.getByText('All').closest('button')
      fireEvent.click(allButton!)
      
      expect(onChange).toHaveBeenCalledWith('all')
    })
  })
  
  describe('Icons', () => {
    it('renders icons for each option', () => {
      const onChange = vi.fn()
      const { container } = render(
        <TransactionStatusFilter value="all" onChange={onChange} />
      )
      
      // Should have 3 icons (one for each option)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBe(3)
    })
  })
  
  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const onChange = vi.fn()
      render(<TransactionStatusFilter value="planned" onChange={onChange} />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed')
      })
    })
    
    it('has focus styles', () => {
      const onChange = vi.fn()
      render(<TransactionStatusFilter value="all" onChange={onChange} />)
      
      const button = screen.getByText('Planned').closest('button')
      expect(button?.className).toContain('focus:outline-none')
      expect(button?.className).toContain('focus:ring-2')
    })
    
    it('applies custom className', () => {
      const onChange = vi.fn()
      const { container } = render(
        <TransactionStatusFilter
          value="all"
          onChange={onChange}
          className="custom-class"
        />
      )
      
      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('custom-class')
    })
  })
  
  describe('Count Display', () => {
    it('shows count badge with correct styling for active option', () => {
      const onChange = vi.fn()
      render(
        <TransactionStatusFilter
          value="planned"
          onChange={onChange}
          plannedCount={5}
        />
      )
      
      const countBadge = screen.getByText('5')
      expect(countBadge.className).toContain('bg-white/20')
    })
    
    it('shows count badge with different styling for inactive option', () => {
      const onChange = vi.fn()
      render(
        <TransactionStatusFilter
          value="all"
          onChange={onChange}
          completedCount={10}
        />
      )
      
      const countBadge = screen.getByText('10')
      expect(countBadge.className).toContain('bg-[var(--bg-glass)]')
    })
  })
})
