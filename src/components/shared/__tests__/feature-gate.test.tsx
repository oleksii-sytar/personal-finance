import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatureGate, useFeatureFlag } from '../feature-gate'
import * as featureFlags from '@/config/feature-flags'

// Mock the feature flags module
vi.mock('@/config/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
  FEATURE_METADATA: {
    FUTURE_TRANSACTIONS: {
      name: 'Future Transactions',
      description: 'Plan and schedule future transactions',
      availableIn: 'v1.2',
    },
    DAILY_FORECAST: {
      name: 'Daily Cash Flow Forecast',
      description: 'See projected daily balances',
    },
  },
}))

describe('FeatureGate', () => {
  it('renders children when feature is enabled', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true)
    
    render(
      <FeatureGate feature="FUTURE_TRANSACTIONS">
        <div>Feature Content</div>
      </FeatureGate>
    )
    
    expect(screen.getByText('Feature Content')).toBeInTheDocument()
  })

  it('renders nothing when feature is disabled and no fallback', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false)
    
    const { container } = render(
      <FeatureGate feature="FUTURE_TRANSACTIONS">
        <div>Feature Content</div>
      </FeatureGate>
    )
    
    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument()
    expect(container.textContent).toBe('')
  })

  it('renders fallback when feature is disabled', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false)
    
    render(
      <FeatureGate 
        feature="FUTURE_TRANSACTIONS"
        fallback={<div>Coming Soon</div>}
      >
        <div>Feature Content</div>
      </FeatureGate>
    )
    
    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument()
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })

  it('renders coming soon message when showComingSoon is true', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false)
    
    render(
      <FeatureGate 
        feature="FUTURE_TRANSACTIONS"
        showComingSoon={true}
      >
        <div>Feature Content</div>
      </FeatureGate>
    )
    
    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument()
    expect(screen.getByText('Future Transactions')).toBeInTheDocument()
    expect(screen.getByText('Plan and schedule future transactions')).toBeInTheDocument()
    expect(screen.getByText('Coming in v1.2')).toBeInTheDocument()
  })

  it('does not show availableIn badge when not specified', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false)
    
    render(
      <FeatureGate 
        feature="DAILY_FORECAST"
        showComingSoon={true}
      >
        <div>Feature Content</div>
      </FeatureGate>
    )
    
    expect(screen.getByText('Daily Cash Flow Forecast')).toBeInTheDocument()
    expect(screen.queryByText(/Coming in/)).not.toBeInTheDocument()
  })
})

describe('useFeatureFlag', () => {
  it('returns true when feature is enabled', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true)
    
    function TestComponent() {
      const isEnabled = useFeatureFlag('FUTURE_TRANSACTIONS')
      return <div>{isEnabled ? 'Enabled' : 'Disabled'}</div>
    }
    
    render(<TestComponent />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('returns false when feature is disabled', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false)
    
    function TestComponent() {
      const isEnabled = useFeatureFlag('FUTURE_TRANSACTIONS')
      return <div>{isEnabled ? 'Enabled' : 'Disabled'}</div>
    }
    
    render(<TestComponent />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
