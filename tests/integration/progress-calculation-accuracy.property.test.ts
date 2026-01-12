/**
 * Property-Based Test for Progress Calculation Accuracy
 * 
 * Feature: checkpoint-reconciliation-enhancement, Property: Progress Calculation Accuracy
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import { ReconciliationProgressService } from '@/lib/services/reconciliation-progress'
import { ReconciliationStep } from '@/types/reconciliation'
import type { ReconciliationSession } from '@/types/reconciliation'

describe('Progress Calculation Accuracy Property Tests', () => {
  const progressService = new ReconciliationProgressService()

  /**
   * Property: Progress percentage should always be between 0 and 100
   * For any valid reconciliation session state, the calculated progress percentage
   * should be within the valid range of 0-100%.
   */
  it('should always calculate progress percentage between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ReconciliationStep)),
        fc.array(fc.constantFrom(...Object.values(ReconciliationStep)), { minLength: 0, maxLength: 7 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (currentStep, completedSteps, gapsRemaining, totalGaps) => {
          // Ensure totalGaps >= gapsRemaining for valid state
          const validTotalGaps = Math.max(totalGaps, gapsRemaining)
          
          const progressPercentage = progressService.calculateProgressPercentage(
            currentStep,
            completedSteps,
            gapsRemaining,
            validTotalGaps
          )

          expect(progressPercentage).toBeGreaterThanOrEqual(0)
          expect(progressPercentage).toBeLessThanOrEqual(100)
          expect(Number.isFinite(progressPercentage)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Progress should increase when gaps are resolved
   * For any reconciliation session, resolving gaps should increase or maintain
   * the progress percentage (never decrease it).
   */
  it('should increase progress when gaps are resolved', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ReconciliationStep)),
        fc.array(fc.constantFrom(...Object.values(ReconciliationStep)), { minLength: 0, maxLength: 7 }),
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (currentStep, completedSteps, initialGaps, totalGaps) => {
          // Ensure valid state
          const validTotalGaps = Math.max(totalGaps, initialGaps)
          const resolvedGaps = Math.max(0, initialGaps - 1) // Resolve at least one gap
          
          const initialProgress = progressService.calculateProgressPercentage(
            currentStep,
            completedSteps,
            initialGaps,
            validTotalGaps
          )
          
          const improvedProgress = progressService.calculateProgressPercentage(
            currentStep,
            completedSteps,
            resolvedGaps,
            validTotalGaps
          )

          expect(improvedProgress).toBeGreaterThanOrEqual(initialProgress)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Completion time estimation should be positive and finite
   * For any valid reconciliation state, the estimated completion time
   * should be a positive, finite number.
   */
  it('should always estimate positive finite completion time', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ReconciliationStep)),
        fc.array(fc.constantFrom(...Object.values(ReconciliationStep)), { minLength: 0, maxLength: 7 }),
        fc.integer({ min: 0, max: 20 }),
        (currentStep, remainingSteps, gapsRemaining) => {
          const estimatedTime = progressService.estimateCompletionTime(
            currentStep,
            remainingSteps,
            gapsRemaining
          )

          expect(estimatedTime).toBeGreaterThanOrEqual(0)
          expect(Number.isFinite(estimatedTime)).toBe(true)
          expect(Number.isInteger(estimatedTime)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: More gaps should result in longer estimated completion time
   * For any reconciliation state, having more gaps should increase the
   * estimated completion time.
   */
  it('should estimate longer time for more gaps', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ReconciliationStep)),
        fc.array(fc.constantFrom(...Object.values(ReconciliationStep)), { minLength: 0, maxLength: 7 }),
        fc.integer({ min: 1, max: 10 }),
        (currentStep, remainingSteps, baseGaps) => {
          const fewerGaps = baseGaps
          const moreGaps = baseGaps + 5
          
          const timeWithFewerGaps = progressService.estimateCompletionTime(
            currentStep,
            remainingSteps,
            fewerGaps
          )
          
          const timeWithMoreGaps = progressService.estimateCompletionTime(
            currentStep,
            remainingSteps,
            moreGaps
          )

          expect(timeWithMoreGaps).toBeGreaterThanOrEqual(timeWithFewerGaps)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Step completion validation should be consistent
   * For any reconciliation session, step completion validation should
   * return consistent results for the same input.
   */
  it('should consistently validate step completion', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ReconciliationStep)),
        fc.integer({ min: 0, max: 10 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (step, gapsRemaining, sessionId, workspaceId, checkpointId) => {
          const mockSession: ReconciliationSession = {
            id: sessionId,
            workspace_id: workspaceId,
            checkpoint_id: checkpointId,
            current_step: step,
            progress_percentage: 50,
            gaps_remaining: gapsRemaining,
            started_at: new Date(),
            last_activity_at: new Date(),
            status: 'active',
            metadata: {
              device_type: 'desktop',
              user_agent: 'test',
              initial_gap_count: gapsRemaining + 2,
              resolution_methods_used: [],
              time_spent_per_step: {}
            }
          }

          const validation1 = progressService.validateStepCompletion(step, mockSession)
          const validation2 = progressService.validateStepCompletion(step, mockSession)

          expect(validation1.isComplete).toBe(validation2.isComplete)
          expect(validation1.reason).toBe(validation2.reason)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Gap resolution step should only be complete when no gaps remain
   * For the gap resolution step specifically, completion should only be true
   * when gaps_remaining is 0.
   */
  it('should only complete gap resolution when no gaps remain', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (gapsRemaining, sessionId, workspaceId, checkpointId) => {
          const mockSession: ReconciliationSession = {
            id: sessionId,
            workspace_id: workspaceId,
            checkpoint_id: checkpointId,
            current_step: ReconciliationStep.GAP_RESOLUTION,
            progress_percentage: 50,
            gaps_remaining: gapsRemaining,
            started_at: new Date(),
            last_activity_at: new Date(),
            status: 'active',
            metadata: {
              device_type: 'desktop',
              user_agent: 'test',
              initial_gap_count: gapsRemaining + 2,
              resolution_methods_used: [],
              time_spent_per_step: {}
            }
          }

          const validation = progressService.validateStepCompletion(
            ReconciliationStep.GAP_RESOLUTION,
            mockSession
          )

          if (gapsRemaining === 0) {
            expect(validation.isComplete).toBe(true)
          } else {
            expect(validation.isComplete).toBe(false)
            expect(validation.reason).toContain('gaps remaining')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Progress summary should have consistent gap counts
   * For any reconciliation session, the gaps summary should have
   * mathematically consistent counts (total = resolved + remaining).
   */
  it('should generate consistent gap counts in summary', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ReconciliationStep)),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (currentStep, gapsRemaining, initialGapCount, sessionId, workspaceId, checkpointId) => {
          const validInitialCount = Math.max(initialGapCount, gapsRemaining)
          
          const mockSession: ReconciliationSession = {
            id: sessionId,
            workspace_id: workspaceId,
            checkpoint_id: checkpointId,
            current_step: currentStep,
            progress_percentage: 50,
            gaps_remaining: gapsRemaining,
            started_at: new Date(),
            last_activity_at: new Date(),
            status: 'active',
            metadata: {
              device_type: 'desktop',
              user_agent: 'test',
              initial_gap_count: validInitialCount,
              resolution_methods_used: [],
              time_spent_per_step: {}
            }
          }

          const summary = progressService.generateGapsSummary(mockSession)

          expect(summary.total_gaps).toBe(validInitialCount)
          expect(summary.remaining_gaps).toBe(gapsRemaining)
          expect(summary.resolved_gaps).toBe(validInitialCount - gapsRemaining)
          expect(summary.total_gaps).toBe(summary.resolved_gaps + summary.remaining_gaps)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Step display information should be consistent and non-empty
   * For any reconciliation step, the display information should be
   * consistent and contain meaningful content.
   */
  it('should provide consistent non-empty step display information', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ReconciliationStep)),
        (step) => {
          const displayInfo = progressService.getStepDisplayInfo(step)

          expect(displayInfo.label).toBeTruthy()
          expect(displayInfo.description).toBeTruthy()
          expect(displayInfo.shortDescription).toBeTruthy()
          expect(typeof displayInfo.label).toBe('string')
          expect(typeof displayInfo.description).toBe('string')
          expect(typeof displayInfo.shortDescription).toBe('string')
          expect(displayInfo.label.length).toBeGreaterThan(0)
          expect(displayInfo.description.length).toBeGreaterThan(0)
          expect(displayInfo.shortDescription.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 50 } // Fewer runs since this is testing static data
    )
  })
})