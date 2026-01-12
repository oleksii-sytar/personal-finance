# Checkpoint Timeline Simplification Design

## Overview

This design transforms the over-engineered reconciliation system into a simple checkpoint timeline that integrates directly with the transaction page. Users can create balance snapshots (checkpoints) that automatically calculate and store gaps between expected and actual balances. The design eliminates complex reconciliation workflows in favor of a straightforward timeline view.

## Architecture

### High-Level Architecture

```
Transaction Page
├── Transaction List (existing)
├── Add Checkpoint Button (new)
├── Checkpoint Creation Modal (simplified)
└── Checkpoint Timeline Component (new)
    ├── Timeline Visualization
    ├── Gap Indicators
    └── Checkpoint Details
```

### Data Flow

```
1. User clicks "Add Checkpoint" → Opens modal
2. User enters date + actual balance → Triggers calculation
3. System calculates expected balance from transactions
4. System calculates gap (actual - expected)
5. System saves checkpoint with gap → Closes modal
6. Timeline refreshes with new checkpoint
```

## Components and Interfaces

### Core Components

#### 1. CheckpointTimelineView
**Location**: `src/components/transactions/checkpoint-timeline-view.tsx`
**Purpose**: Display chronological timeline of checkpoints with gaps

```typescript
interface CheckpointTimelineViewProps {
  workspaceId: string
  accountId?: string // Optional filter by account
  className?: string
}
```

**Features**:
- Horizontal timeline showing checkpoints chronologically
- Visual gap indicators (positive/negative/zero)
- Hover details showing transaction count for period
- Empty state encouraging first checkpoint creation

#### 2. CheckpointCreationButton
**Location**: `src/components/transactions/checkpoint-creation-button.tsx`
**Purpose**: Trigger checkpoint creation modal

```typescript
interface CheckpointCreationButtonProps {
  workspaceId: string
  onCheckpointCreated: () => void
  className?: string
}
```

#### 3. CheckpointCreationModal (Simplified)
**Location**: `src/components/reconciliation/checkpoint-creation-modal.tsx` (existing, simplified)
**Purpose**: Create new checkpoint with automatic gap calculation

**Simplified Interface**:
```typescript
interface CheckpointCreationModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onCheckpointCreated: () => void
}
```

**Form Fields**:
- Date picker (defaults to today)
- Account selector
- Actual balance input (currency formatted)
- Expected balance display (calculated, read-only)
- Gap display (calculated, read-only)

### Server Actions

#### createCheckpoint
**Location**: `src/actions/checkpoints.ts`

```typescript
interface CheckpointInput {
  date: string
  actual_balance: number
  account_id: string
  workspace_id: string
}

export async function createCheckpoint(
  formData: FormData
): Promise<ActionResult<Checkpoint>>
```

**Logic**:
1. Validate input data
2. Find previous checkpoint for same account
3. Calculate expected balance from transactions
4. Calculate gap (actual - expected)
5. Save checkpoint with all calculated values

#### recalculateCheckpointGaps
**Location**: `src/actions/checkpoints.ts`

```typescript
export async function recalculateCheckpointGaps(
  transactionDate: Date,
  accountId: string,
  workspaceId: string
): Promise<ActionResult<{ updatedCount: number }>>
```

#### getCheckpointsForTimeline
**Location**: `src/actions/checkpoints.ts`

```typescript
export async function getCheckpointsForTimeline(
  workspaceId: string,
  accountId?: string
): Promise<ActionResult<CheckpointWithPeriodInfo[]>>
```

## Data Models

### Simplified Checkpoint Model

```typescript
interface Checkpoint {
  id: string
  workspace_id: string
  account_id: string
  date: Date
  actual_balance: number
  expected_balance: number  // Calculated at creation
  gap: number              // actual - expected, stored
  created_at: Date
  updated_at: Date
}

interface CheckpointWithPeriodInfo extends Checkpoint {
  transaction_count: number  // Transactions in period
  days_since_previous: number
}
```

### Database Schema (Existing Table)

```sql
-- checkpoints table (existing, may need gap column added)
ALTER TABLE checkpoints 
ADD COLUMN IF NOT EXISTS expected_balance DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS gap DECIMAL(12,2);
```

## Gap Calculation Logic

### Expected Balance Calculation

```typescript
async function calculateExpectedBalance(
  accountId: string,
  checkpointDate: Date,
  workspaceId: string
): Promise<number> {
  // Find most recent previous checkpoint
  const previousCheckpoint = await getPreviousCheckpoint(accountId, checkpointDate)
  
  // Starting balance (0 if no previous checkpoint)
  const startingBalance = previousCheckpoint?.actual_balance || 0
  const startDate = previousCheckpoint?.date || new Date(0)
  
  // Sum all transactions between start date and checkpoint date
  const transactionSum = await sumTransactionsBetweenDates(
    accountId,
    startDate,
    checkpointDate,
    workspaceId
  )
  
  return startingBalance + transactionSum
}
```

### Gap Calculation

```typescript
function calculateGap(actualBalance: number, expectedBalance: number): number {
  return actualBalance - expectedBalance
}

// Positive gap = surplus (actual > expected)
// Negative gap = deficit (actual < expected)  
// Zero gap = perfect match
```

### Automatic Gap Recalculation

**Critical Feature**: Gaps must be automatically recalculated when transactions change to ensure they always represent the current state.

```typescript
async function recalculateAffectedCheckpoints(
  transactionDate: Date,
  accountId: string,
  workspaceId: string
): Promise<void> {
  // Find all checkpoints that could be affected by this transaction
  const affectedCheckpoints = await getCheckpointsAfterDate(
    accountId,
    transactionDate,
    workspaceId
  )
  
  // Recalculate each affected checkpoint
  for (const checkpoint of affectedCheckpoints) {
    const newExpectedBalance = await calculateExpectedBalance(
      accountId,
      checkpoint.date,
      workspaceId
    )
    
    const newGap = calculateGap(checkpoint.actual_balance, newExpectedBalance)
    
    // Update checkpoint with new calculated values
    await updateCheckpoint(checkpoint.id, {
      expected_balance: newExpectedBalance,
      gap: newGap
    })
  }
}
```

### Transaction Event Handlers

```typescript
// Called after any transaction create/update/delete
async function onTransactionChange(
  transaction: Transaction,
  changeType: 'create' | 'update' | 'delete'
): Promise<void> {
  await recalculateAffectedCheckpoints(
    transaction.transaction_date,
    transaction.account_id,
    transaction.workspace_id
  )
  
  // Trigger timeline refresh in UI
  await refreshCheckpointTimeline(transaction.workspace_id)
}
```

## User Interface Design

### Transaction Page Integration

```tsx
// Updated transaction page layout
<div className="transaction-page">
  <div className="page-header">
    <h1>Transactions</h1>
    <div className="header-actions">
      <CheckpointCreationButton 
        workspaceId={workspaceId}
        onCheckpointCreated={refreshTimeline}
      />
      <AddTransactionButton />
    </div>
  </div>
  
  <CheckpointTimelineView 
    workspaceId={workspaceId}
    className="mb-6"
  />
  
  <TransactionList />
</div>
```

### Timeline Visualization

```
[Checkpoint 1] -------- [Checkpoint 2] -------- [Checkpoint 3]
Dec 1, 2024            Dec 15, 2024            Jan 1, 2025
₴5,000 (₴0 gap)       ₴4,800 (-₴200 gap)     ₴5,200 (+₴100 gap)
```

**Visual Indicators**:
- Green dot: Zero gap (perfect match)
- Red dot: Negative gap (deficit)
- Blue dot: Positive gap (surplus)
- Line thickness indicates gap magnitude

### Modal Design (Simplified)

```
┌─────────────────────────────────────┐
│ Create Checkpoint                   │
├─────────────────────────────────────┤
│ Date: [Dec 31, 2024        ▼]      │
│ Account: [Main Account     ▼]      │
│ Actual Balance: [₴ 5,000.00]       │
│                                     │
│ Expected Balance: ₴4,900.00         │
│ Gap: +₴100.00 (surplus)             │
│                                     │
│ [Cancel]              [Create]      │
└─────────────────────────────────────┘
```

## Error Handling

### Validation Rules

1. **Date Validation**: Cannot create checkpoint for future dates
2. **Balance Validation**: Actual balance must be a valid number
3. **Account Validation**: Account must exist and belong to workspace
4. **Duplicate Prevention**: Only one checkpoint per account per date

### Error States

```typescript
interface CheckpointError {
  field?: 'date' | 'actual_balance' | 'account_id'
  message: string
  code: 'INVALID_DATE' | 'INVALID_BALANCE' | 'DUPLICATE_CHECKPOINT' | 'CALCULATION_ERROR'
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After reviewing the prework analysis, several acceptance criteria can be validated through property-based testing. The following properties eliminate redundancy while providing comprehensive validation:

**Property 1: Expected Balance Calculation Consistency**
*For any* set of transactions between two dates and any starting balance, the expected balance should equal the starting balance plus the sum of all transaction amounts in that period
**Validates: Requirements 2.3, 2.4, 4.2**

**Property 2: Gap Calculation Accuracy**  
*For any* actual balance and expected balance values, the gap should always equal actual_balance - expected_balance
**Validates: Requirements 2.5, 4.4**

**Property 3: Zero Starting Balance for First Checkpoint**
*For any* account with no previous checkpoints, the expected balance calculation should start from zero regardless of transaction data
**Validates: Requirements 4.3**

**Property 4: Automatic Gap Recalculation**
*For any* transaction added after a checkpoint date, the affected checkpoint's gap should be automatically recalculated and stored correctly
**Validates: Requirements 5.1, 5.4**

**Property 5: Timeline Ordering Consistency**
*For any* set of checkpoints with different dates, the timeline should display them in chronological order by date descending
**Validates: Requirements 3.2, 6.2**

**Property 6: Gap Sign Convention**
*For any* actual and expected balance pair, positive gaps should indicate surplus (actual > expected) and negative gaps should indicate deficit (actual < expected)
**Validates: Requirements 3.5**

## Testing Strategy

### Dual Testing Approach
- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary for comprehensive coverage

### Unit Tests

1. **Gap Calculation Logic**
   - Test expected balance calculation with specific transaction scenarios
   - Test gap calculation edge cases (zero balances, large numbers)
   - Test error conditions (invalid dates, missing accounts)

2. **Component Rendering**
   - Timeline displays checkpoints correctly
   - Gap indicators show correct colors/states
   - Modal form validation works

### Integration Tests

1. **Checkpoint Creation Flow**
   - End-to-end checkpoint creation
   - Database persistence verification
   - Timeline refresh after creation

2. **Data Consistency**
   - Gap calculations match expected results
   - Timeline ordering is correct
   - Account filtering works

### Property-Based Tests

Property tests will run with minimum 100 iterations per test to ensure comprehensive input coverage. Each test will be tagged with the format: **Feature: checkpoint-timeline-simplification, Property {number}: {property_text}**

## Migration Strategy

### Phase 1: Remove Complex Components
1. Delete reconciliation page and route
2. Remove complex reconciliation components
3. Clean up navigation references
4. Remove unused services and types

### Phase 2: Implement Simplified Components  
1. Create CheckpointTimelineView component
2. Simplify CheckpointCreationModal
3. Add CheckpointCreationButton to transaction page
4. Implement gap calculation logic

### Phase 3: Database Updates
1. Add expected_balance and gap columns to checkpoints table
2. Migrate existing checkpoints (calculate gaps retroactively)
3. Update checkpoint creation to store calculated values

### Phase 4: Integration and Testing
1. Integrate timeline into transaction page
2. Test gap calculations thoroughly
3. Verify timeline displays correctly
4. Clean up any remaining reconciliation references

This design provides a clean, simple checkpoint system that meets user needs without the complexity of the previous reconciliation approach.