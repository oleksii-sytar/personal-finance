/**
 * AccountTypeIcon Component Tests
 * 
 * Tests the icon mapping and styling for different account types
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AccountTypeIcon } from '../account-type-icon'
import type { AccountType } from '@/types'

describe('AccountTypeIcon', () => {
  const accountTypes: AccountType[] = ['checking', 'savings', 'credit', 'investment']

  it.each(accountTypes)('renders icon for %s account type', (type) => {
    render(<AccountTypeIcon type={type} />)
    
    // Check that the icon has the correct aria-label
    const icon = screen.getByLabelText(`${type} account icon`)
    expect(icon).toBeInTheDocument()
  })

  it('applies correct color class for checking account', () => {
    const { container } = render(<AccountTypeIcon type="checking" />)
    const icon = container.querySelector('svg')
    
    expect(icon).toHaveClass('text-accent-primary')
  })

  it('applies correct color class for savings account', () => {
    const { container } = render(<AccountTypeIcon type="savings" />)
    const icon = container.querySelector('svg')
    
    expect(icon).toHaveClass('text-accent-success')
  })

  it('applies correct color class for credit account', () => {
    const { container } = render(<AccountTypeIcon type="credit" />)
    const icon = container.querySelector('svg')
    
    expect(icon).toHaveClass('text-accent-warning')
  })

  it('applies correct color class for investment account', () => {
    const { container } = render(<AccountTypeIcon type="investment" />)
    const icon = container.querySelector('svg')
    
    expect(icon).toHaveClass('text-accent-info')
  })

  it('applies custom className when provided', () => {
    const { container } = render(<AccountTypeIcon type="checking" className="w-8 h-8" />)
    const icon = container.querySelector('svg')
    
    expect(icon).toHaveClass('w-8', 'h-8')
  })

  it('applies transition classes for smooth color changes', () => {
    const { container } = render(<AccountTypeIcon type="checking" />)
    const icon = container.querySelector('svg')
    
    expect(icon).toHaveClass('transition-colors', 'duration-200')
  })
})
