/**
 * AccountTypeBadge Component Tests
 * 
 * Tests for the AccountTypeBadge component to ensure proper rendering
 * and styling according to Executive Lounge design system.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AccountTypeBadge } from '../account-type-badge'
import type { AccountType } from '@/types'

describe('AccountTypeBadge', () => {
  const accountTypes: AccountType[] = ['checking', 'savings', 'credit', 'investment']
  
  it('renders the correct label for checking account', () => {
    render(<AccountTypeBadge type="checking" />)
    expect(screen.getByText('Checking Account')).toBeInTheDocument()
  })
  
  it('renders the correct label for savings account', () => {
    render(<AccountTypeBadge type="savings" />)
    expect(screen.getByText('Savings Account')).toBeInTheDocument()
  })
  
  it('renders the correct label for credit account', () => {
    render(<AccountTypeBadge type="credit" />)
    expect(screen.getByText('Credit Account')).toBeInTheDocument()
  })
  
  it('renders the correct label for investment account', () => {
    render(<AccountTypeBadge type="investment" />)
    expect(screen.getByText('Investment Account')).toBeInTheDocument()
  })
  
  it('applies glass styling classes', () => {
    const { container } = render(<AccountTypeBadge type="checking" />)
    const badge = container.querySelector('span')
    
    expect(badge).toHaveClass('bg-glass')
    expect(badge).toHaveClass('backdrop-blur-sm')
    expect(badge).toHaveClass('border-glass')
    expect(badge).toHaveClass('rounded-full')
  })
  
  it('applies type-specific accent color for checking', () => {
    const { container } = render(<AccountTypeBadge type="checking" />)
    const badge = container.querySelector('span')
    
    expect(badge).toHaveClass('text-accent-primary')
  })
  
  it('applies type-specific accent color for savings', () => {
    const { container } = render(<AccountTypeBadge type="savings" />)
    const badge = container.querySelector('span')
    
    expect(badge).toHaveClass('text-accent-success')
  })
  
  it('applies type-specific accent color for credit', () => {
    const { container } = render(<AccountTypeBadge type="credit" />)
    const badge = container.querySelector('span')
    
    expect(badge).toHaveClass('text-accent-warning')
  })
  
  it('applies type-specific accent color for investment', () => {
    const { container } = render(<AccountTypeBadge type="investment" />)
    const badge = container.querySelector('span')
    
    expect(badge).toHaveClass('text-accent-info')
  })
  
  it('ensures mobile-friendly touch target (min 44px)', () => {
    const { container } = render(<AccountTypeBadge type="checking" />)
    const badge = container.querySelector('span')
    
    expect(badge).toHaveClass('min-h-[44px]')
  })
  
  it('applies custom className when provided', () => {
    const { container } = render(<AccountTypeBadge type="checking" className="custom-class" />)
    const badge = container.querySelector('span')
    
    expect(badge).toHaveClass('custom-class')
  })
  
  it('has proper accessibility attributes', () => {
    render(<AccountTypeBadge type="checking" />)
    const badge = screen.getByRole('status')
    
    expect(badge).toHaveAttribute('aria-label', 'Account type: Checking Account')
  })
  
  it('renders all account types correctly', () => {
    accountTypes.forEach(type => {
      const { unmount } = render(<AccountTypeBadge type={type} />)
      const expectedLabels: Record<AccountType, string> = {
        checking: 'Checking Account',
        savings: 'Savings Account',
        credit: 'Credit Account',
        investment: 'Investment Account',
      }
      
      expect(screen.getByText(expectedLabels[type])).toBeInTheDocument()
      unmount()
    })
  })
})
