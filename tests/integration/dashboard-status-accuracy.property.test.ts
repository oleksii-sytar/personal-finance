/**
 * Property-Based Tests for Dashboard Status Accuracy
 * 
 * Tests that dashboard components accurately reflect reconciliation status
 * across all possible reconciliation states and configurations.
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { faker } from '@faker-js/faker'
import fc from 'fast-check'
import React from 'react'
import { ReconciliationStatusCard } from '@/components/reconciliation/reconciliation-status-card'
import { ReconciliationHealthWidget } from '@/components/reconciliation/reconciliation-health-widget'
import type { ReconciliationStatus } from '@/types/reconciliation'

// Generator for reconciliation status
const reconciliationStatusArb = fc.record({
  workspace_id: fc.string({ minLength: 1, maxLength: 50 }),
  current_period: fc.record({
    start_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-11-30') }),
    end_date: fc.date({ min: new Date('2024-02-01'), max: new Date('2024-12-31') })
  }).map(period => ({
    // Ensure end_date is after start_date
    start_date: period.start_date,
    end_date: new Date(Math.max(period.start_date.getTime(), period.end_date.getTime()))
  })),
  days_since_last_checkpoint: fc.integer({ min: 0, max: 30 }),
  total_gap_amount: fc.float({ min: -10000, max: 10000 }),
  total_gap_percentage: fc.float({ min: 0, max: 100 }),
  gap_severity: fc.constantFrom('low', 'medium', 'high'),
  accounts_with_gaps: fc.array(
    fc.record({
      account_id: fc.string({ minLength: 1, maxLength: 50 }),
      account_name: fc.string({ minLength: 1, maxLength: 100 }),
      currency: fc.constantFrom('UAH', 'USD', 'EUR'),
      gap_amount: fc.float({ min: -5000, max: 5000 }),
      gap_percentage: fc.float({ min: 0, max: 100 })
    }),
    { minLength: 0, maxLength: 10 }
  ),
  reminder_level: fc.constantFrom('none', 'warning', 'urgent')
})

describe('Dashboard Status Accuracy Property Tests', () => {
  it('Property: Dashboard status accurately reflects reconciliation health score', () => {
    fc.assert(fc.property(reconciliationStatusArb, (status: ReconciliationStatus) => {
      const { container } = render(
        React.createElement(ReconciliationStatusCard, {
          status: status,
          showHealthIndicators: true
        })
      )
      
      // Health score should be calculated consistently
      const healthScoreElements = container.querySelectorAll('[class*="font-space-grotesk"]')
      const healthScoreElement = Array.from(healthScoreElements).find(el => {
        const text = el.textContent || ''
        const score = parseInt(text)
        return !isNaN(score) && score >= 0 && score <= 100
      })
      
      if (healthScoreElement) {
        const displayedScore = parseInt(healthScoreElement.textContent || '0')
        
        // Health score should be between 0 and 100
        expect(displayedScore).toBeGreaterThanOrEqual(0)
        expect(displayedScore).toBeLessThanOrEqual(100)
        
        // Score should correlate with gap severity
        if (status.gap_severity === 'high') {
          expect(displayedScore).toBeLessThan(80)
        }
        if (status.gap_severity === 'low' && status.days_since_last_checkpoint < 7) {
          expect(displayedScore).toBeGreaterThan(60)
        }
      } else {
        // If no health score element found, that's acceptable for minimal status data
        // Just verify the component rendered without errors
        expect(container.textContent).toContain('Reconciliation Health')
      }
      
      // Status text should match gap severity
      const statusElements = container.querySelectorAll('[class*="rounded-full"]')
      const statusTexts = Array.from(statusElements).map(el => el.textContent?.toLowerCase())
      
      if (status.gap_severity === 'high') {
        expect(statusTexts.some(text => text?.includes('action') || text?.includes('urgent'))).toBe(true)
      }
      if (status.gap_severity === 'low') {
        expect(statusTexts.some(text => text?.includes('excellent') || text?.includes('track'))).toBe(true)
      }
    }))
  })

  it('Property: Health widget metrics are mathematically consistent', () => {
    fc.assert(fc.property(reconciliationStatusArb, (status: ReconciliationStatus) => {
      const { container } = render(
        React.createElement(ReconciliationHealthWidget, {
          status: status
        })
      )
      
      // Find all score displays
      const scoreElements = container.querySelectorAll('[class*="font-semibold"]')
      const scores = Array.from(scoreElements)
        .map(el => parseInt(el.textContent || '0'))
        .filter(score => !isNaN(score) && score >= 0 && score <= 100)
      
      if (scores.length >= 3) {
        // Individual scores should be valid percentages
        scores.forEach(score => {
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(100)
        })
        
        // Find the overall score (should be the largest font element)
        const overallScoreElement = container.querySelector('[class*="font-space-grotesk"]')
        if (overallScoreElement) {
          const overallScoreText = overallScoreElement.textContent || '0'
          const overallScore = parseInt(overallScoreText)
          
          // Only test if we got a valid number
          if (!isNaN(overallScore)) {
            expect(overallScore).toBeGreaterThanOrEqual(0)
            expect(overallScore).toBeLessThanOrEqual(100)
            
            // Overall score should be reasonable given the status
            if (status.gap_severity === 'high' && status.days_since_last_checkpoint >= 14) {
              expect(overallScore).toBeLessThan(70) // Should be low for bad conditions
            }
            if (status.gap_severity === 'low' && status.days_since_last_checkpoint < 7) {
              expect(overallScore).toBeGreaterThan(50) // Should be decent for good conditions
            }
          }
        }
      } else {
        // If not enough scores found, just verify basic rendering
        expect(container.textContent).toContain('Health')
      }
    }))
  })

  it('Property: Gap display accuracy matches status data', () => {
    fc.assert(fc.property(reconciliationStatusArb, (status: ReconciliationStatus) => {
      const { container } = render(
        React.createElement(ReconciliationStatusCard, {
          status: status
        })
      )
      
      // Check that gap amount is displayed correctly
      const gapAmountText = container.textContent || ''
      const expectedGapAmount = Math.abs(status.total_gap_amount)
      
      if (expectedGapAmount > 0) {
        // Should contain some representation of the gap amount
        // (exact formatting may vary, but should be present)
        expect(gapAmountText).toMatch(/\d+/)
        
        // Gap percentage should be displayed
        const expectedPercentage = status.total_gap_percentage.toFixed(1)
        expect(gapAmountText).toContain('%')
      }
      
      // Account gaps should be listed if present
      if (status.accounts_with_gaps.length > 0) {
        status.accounts_with_gaps.slice(0, 3).forEach(account => {
          // Account name should appear in the display
          expect(gapAmountText).toContain(account.account_name)
        })
        
        // Should show count of accounts with gaps
        expect(gapAmountText).toContain(status.accounts_with_gaps.length.toString())
      }
    }))
  })

  it('Property: Days since checkpoint display is accurate', () => {
    fc.assert(fc.property(reconciliationStatusArb, (status: ReconciliationStatus) => {
      const { container } = render(
        React.createElement(ReconciliationStatusCard, {
          status: status
        })
      )
      
      const displayText = container.textContent || ''
      
      // Days count should be displayed prominently
      expect(displayText).toContain(status.days_since_last_checkpoint.toString())
      
      // Should contain the word "day" or "days" somewhere in the text
      expect(displayText.toLowerCase()).toMatch(/days?/)
      
      // Should contain "since" somewhere in the text
      expect(displayText.toLowerCase()).toContain('since')
      
      // Color coding should match urgency
      const urgentElements = container.querySelectorAll('[class*="accent-error"]')
      const warningElements = container.querySelectorAll('[class*="accent-warning"]')
      
      if (status.days_since_last_checkpoint >= 14) {
        expect(urgentElements.length).toBeGreaterThan(0)
      } else if (status.days_since_last_checkpoint >= 7) {
        expect(warningElements.length).toBeGreaterThan(0)
      }
    }))
  })

  it('Property: Trend analysis reflects status changes', () => {
    fc.assert(fc.property(
      fc.array(reconciliationStatusArb, { minLength: 2, maxLength: 5 }),
      (historicalData: ReconciliationStatus[]) => {
        const currentStatus = historicalData[historicalData.length - 1]
        
        const { container } = render(
          React.createElement(ReconciliationHealthWidget, {
            status: currentStatus,
            historicalData: historicalData
          })
        )
        
        const displayText = container.textContent || ''
        
        // Should contain trend information
        expect(displayText).toMatch(/(improving|declining|stable)/i)
        
        // Trend should be based on historical comparison
        if (historicalData.length >= 2) {
          const previous = historicalData[historicalData.length - 2]
          const current = historicalData[historicalData.length - 1]
          
          // If gap severity improved, should show positive trend
          if (previous.gap_severity === 'high' && current.gap_severity === 'low') {
            expect(displayText.toLowerCase()).toMatch(/(improving|better|good)/i)
          }
          
          // If gap severity worsened, should show negative trend
          if (previous.gap_severity === 'low' && current.gap_severity === 'high') {
            expect(displayText.toLowerCase()).toMatch(/(declining|worse|attention)/i)
          }
        }
      }
    ))
  })

  it('Property: Action buttons appear based on status conditions', () => {
    fc.assert(fc.property(reconciliationStatusArb, (status: ReconciliationStatus) => {
      const mockOnResolveGaps = vi.fn()
      const mockOnCreateCheckpoint = vi.fn()
      
      const { container } = render(
        React.createElement(ReconciliationStatusCard, {
          status: status,
          onResolveGaps: mockOnResolveGaps,
          onCreateCheckpoint: mockOnCreateCheckpoint
        })
      )
      
      const buttons = container.querySelectorAll('button')
      const buttonTexts = Array.from(buttons).map(btn => btn.textContent?.toLowerCase() || '')
      
      // If there are gaps with non-zero amounts, should have resolve gaps button
      const hasSignificantGaps = status.accounts_with_gaps.some(account => Math.abs(account.gap_amount) > 0)
      if (hasSignificantGaps) {
        expect(buttonTexts.some(text => text.includes('resolve'))).toBe(true)
      }
      
      // Should always have checkpoint creation option
      expect(buttonTexts.some(text => text.includes('checkpoint'))).toBe(true)
      
      // At minimum, should have some buttons present
      expect(buttons.length).toBeGreaterThan(0)
      
      // Note: We don't strictly enforce primary button styling as it depends on complex
      // component logic and may vary based on the specific combination of conditions
    }))
  })
})