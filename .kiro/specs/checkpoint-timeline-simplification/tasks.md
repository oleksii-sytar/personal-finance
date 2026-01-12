# Implementation Plan: Checkpoint Timeline Simplification

## Overview

This implementation plan transforms the over-engineered reconciliation system into a simple checkpoint timeline integrated with the transaction page. The approach removes complex reconciliation components and implements automatic gap calculation and recalculation.

## Tasks

- [x] 1. Remove Complex Reconciliation Components
  - Delete reconciliation page and route
  - Remove complex reconciliation components from src/components/reconciliation/
  - Clean up navigation references and imports
  - Remove unused reconciliation services and types
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write unit tests for component cleanup verification
  - Test that reconciliation routes return 404
  - Test that navigation no longer includes reconciliation links
  - _Requirements: 1.1, 1.2_

- [x] 2. Update Database Schema for Gap Storage
  - Add expected_balance and gap columns to checkpoints table
  - Create migration for new columns with default values
  - Update checkpoint types to include new fields
  - _Requirements: 6.1, 4.4, 4.5_

- [ ]* 2.1 Write property test for gap calculation accuracy
  - **Property 2: Gap Calculation Accuracy**
  - **Validates: Requirements 2.5, 4.4**

- [x] 3. Implement Gap Calculation Logic
  - [x] 3.1 Create calculateExpectedBalance function
    - Find previous checkpoint for same account
    - Sum transactions between checkpoint dates
    - Handle zero starting balance for first checkpoint
    - _Requirements: 2.3, 2.4, 4.2, 4.3_

- [x]* 3.2 Write property test for expected balance calculation
  - **Property 1: Expected Balance Calculation Consistency**
  - **Validates: Requirements 2.3, 2.4, 4.2**

- [ ]* 3.3 Write property test for zero starting balance
  - **Property 3: Zero Starting Balance for First Checkpoint**
  - **Validates: Requirements 4.3**

- [x] 3.4 Create gap calculation and storage functions
  - Implement calculateGap function (actual - expected)
  - Create checkpoint creation with automatic gap calculation
  - _Requirements: 2.5, 4.4_

- [x] 4. Implement Automatic Gap Recalculation
  - [x] 4.1 Create recalculateAffectedCheckpoints function
    - Find checkpoints after transaction date
    - Recalculate expected balance and gap for each
    - Update checkpoint records with new values
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 4.2 Write property test for automatic recalculation
  - **Property 4: Automatic Gap Recalculation**
  - **Validates: Requirements 5.1, 5.4**

- [x] 4.3 Add transaction event handlers
  - Hook into transaction create/update/delete actions
  - Trigger gap recalculation for affected checkpoints
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5. Create Checkpoint Timeline Component
  - [x] 5.1 Build CheckpointTimelineView component
    - Display checkpoints chronologically
    - Show visual gap indicators (green/red/blue dots)
    - Handle empty state with encouragement message
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

- [ ]* 5.2 Write property test for timeline ordering
  - **Property 5: Timeline Ordering Consistency**
  - **Validates: Requirements 3.2, 6.2**

- [ ]* 5.3 Write property test for gap sign convention
  - **Property 6: Gap Sign Convention**
  - **Validates: Requirements 3.5**

- [x] 5.4 Add hover details and interaction
  - Show checkpoint details on hover/click
  - Display transaction count for period
  - _Requirements: 3.4_

- [x] 6. Simplify Checkpoint Creation Modal
  - [x] 6.1 Update CheckpointCreationModal component
    - Simplify form to date, account, actual balance
    - Show calculated expected balance and gap in real-time
    - Remove complex reconciliation workflow elements
    - _Requirements: 2.1, 2.2, 2.6_

- [ ]* 6.2 Write unit tests for modal functionality
  - Test form validation and submission
  - Test real-time calculation display
  - _Requirements: 2.1, 2.2_

- [x] 6.3 Create CheckpointCreationButton component
  - Add button to transaction page header
  - Handle modal open/close state
  - _Requirements: 2.1_

- [x] 7. Integrate Timeline with Transaction Page
  - [x] 7.1 Add timeline component to transaction page
    - Place timeline above transaction list
    - Connect to checkpoint data and refresh logic
    - _Requirements: 3.1_

- [x] 7.2 Update transaction page layout
  - Add checkpoint creation button to header
  - Ensure responsive design works with timeline
  - _Requirements: 2.1_

- [ ]* 7.3 Write integration tests for page integration
  - Test checkpoint creation flow end-to-end
  - Test timeline refresh after checkpoint creation
  - _Requirements: 2.6, 3.1_

- [x] 8. Create Server Actions
  - [x] 8.1 Implement createCheckpoint server action
    - Validate input data with Zod schema
    - Calculate expected balance and gap
    - Save checkpoint with calculated values
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 8.2 Implement getCheckpointsForTimeline server action
  - Query checkpoints with period information
  - Order by date descending
  - Include transaction count for each period
  - _Requirements: 3.2, 6.2_

- [x] 8.3 Implement recalculateCheckpointGaps server action
  - Find and update affected checkpoints
  - Return count of updated checkpoints
  - _Requirements: 5.4_

- [ ]* 8.4 Write unit tests for server actions
  - Test validation and error handling
  - Test database operations
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 9. Update Navigation and Cleanup
  - [x] 9.1 Remove reconciliation from dashboard navigation
    - Update layout.tsx navigation array
    - Remove reconciliation route imports
    - _Requirements: 1.5_

- [x] 9.2 Clean up reconciliation imports and references
  - Remove reconciliation components from dashboard
  - Update component index files
  - Clean up unused type imports
  - _Requirements: 1.3, 1.4_

- [ ]* 9.3 Write integration tests for navigation cleanup
  - Test that reconciliation routes are removed
  - Test that navigation works correctly
  - _Requirements: 1.1, 1.2_

- [-] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Final Integration and Polish
  - [ ] 11.1 Test complete checkpoint workflow
    - Create checkpoint from transaction page
    - Verify gap calculation accuracy
    - Test automatic recalculation when adding transactions
    - _Requirements: 2.6, 5.5_

- [ ] 11.2 Verify timeline displays correctly
  - Test with various checkpoint scenarios
  - Verify gap indicators show correct colors
  - Test responsive design across breakpoints
  - _Requirements: 3.2, 3.3, 3.5_

- [ ]* 11.3 Write end-to-end tests for complete workflow
  - Test full user journey from transaction page
  - Test gap recalculation scenarios
  - _Requirements: 5.5, 5.6_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Focus on automatic gap recalculation as the most critical feature