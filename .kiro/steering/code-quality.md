# Forma - Code Quality Standards

## Overview

This document defines the code quality standards, clean code practices, and refactoring guidelines for the Forma project. The core principle is: **Leave the code cleaner than you found it.**

## Core Principles

### The Boy Scout Rule
> "Always leave the campground cleaner than you found it."

Every time you touch code:
1. Fix any small issues you notice
2. Improve naming if unclear
3. Add missing types
4. Remove dead code
5. Update outdated comments

### SOLID Principles

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | Each component/function does one thing well |
| **Open/Closed** | Extend through composition, not modification |
| **Liskov Substitution** | Subcomponents should be interchangeable |
| **Interface Segregation** | Props interfaces should be minimal and focused |
| **Dependency Inversion** | Depend on abstractions, not implementations |

## TypeScript Standards

### Type Everything
```typescript
// ❌ Bad - implicit any
function processTransaction(data) {
  return data.amount * 100
}

// ✅ Good - explicit types
interface TransactionInput {
  amount: number
  currency: string
  description: string
}

function processTransaction(data: TransactionInput): number {
  return data.amount * 100
}
```

### Use Type Inference When Clear
```typescript
// ❌ Unnecessary - type is obvious
const count: number = 0
const name: string = 'Forma'

// ✅ Better - let TypeScript infer
const count = 0
const name = 'Forma'

// ✅ But be explicit for complex types or function returns
function calculateBalance(transactions: Transaction[]): BalanceResult {
  // ...
}
```

### Prefer Interfaces for Public APIs
```typescript
// ✅ Interface for component props
interface TransactionCardProps {
  transaction: Transaction
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

// ✅ Type for internal/derived types
type TransactionStatus = 'pending' | 'completed' | 'failed'
type TransactionWithCategory = Transaction & { category: Category }
```

### Use Zod for Runtime Validation
```typescript
// src/lib/validations/transaction.ts
import { z } from 'zod'

export const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Invalid currency code'),
  description: z.string().min(1, 'Description is required').max(255),
  category_id: z.string().uuid('Invalid category'),
  transaction_date: z.coerce.date(),
})

export type TransactionInput = z.infer<typeof transactionSchema>
```

## React Component Standards

### Functional Components Only
```typescript
// ✅ Always use functional components
export function TransactionCard({ transaction }: TransactionCardProps) {
  return <div>...</div>
}

// ❌ Never use class components
class TransactionCard extends Component { /* ... */ }
```

### Component Organization
```typescript
// 1. Imports (grouped and ordered)
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/types'

// 2. Types
interface TransactionCardProps {
  transaction: Transaction
  className?: string
}

// 3. Component
export function TransactionCard({ 
  transaction, 
  className 
}: TransactionCardProps) {
  // 3a. Hooks (always at the top, unconditionally)
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  
  // 3b. Derived state / memoization
  const formattedAmount = useMemo(
    () => formatCurrency(transaction.amount, transaction.currency),
    [transaction.amount, transaction.currency]
  )
  
  // 3c. Handlers
  const handleEdit = () => {
    setIsEditing(true)
  }
  
  // 3d. Effects (if needed)
  // useEffect(...)
  
  // 3e. Render
  return (
    <div className={cn('p-4 rounded-lg', className)}>
      {/* ... */}
    </div>
  )
}
```

### Props Destructuring
```typescript
// ✅ Destructure in function signature for simple props
function Button({ children, variant, size }: ButtonProps) {
  // ...
}

// ✅ Destructure in body for many props or when spreading
function TransactionForm(props: TransactionFormProps) {
  const { 
    defaultValues, 
    onSubmit, 
    onCancel,
    isLoading,
    ...rest 
  } = props
  // ...
}
```

## Naming Conventions

### Components
```typescript
// ✅ PascalCase, descriptive names
TransactionCard
CategorySelector
DateRangePicker
MonthlyReportChart

// ❌ Avoid abbreviations or unclear names
TxCard
CatSel
DRP
MRC
```

### Hooks
```typescript
// ✅ Use "use" prefix, describe what it does
useTransactions()
useCategories()
useLocalStorage()
useDebounce()

// ❌ Avoid generic names
useData()
useFetch()
useStuff()
```

### Event Handlers
```typescript
// ✅ Use "handle" + noun + verb pattern
handleTransactionCreate
handleFormSubmit
handleModalClose
handleRowClick

// ✅ For prop callbacks, use "on" + noun + verb
onTransactionCreate
onFormSubmit
onClose
```

### Boolean Variables
```typescript
// ✅ Use is/has/should/can prefix
isLoading
hasError
shouldShowModal
canEdit

// ❌ Avoid ambiguous names
loading  // Is this a loading state or a loading action?
error    // Is this an error object or error state?
```

## File Organization

### One Component Per File
```typescript
// ✅ src/components/transactions/transaction-card.tsx
export function TransactionCard() { }

// ✅ OK to have closely related sub-components in same file
// src/components/transactions/transaction-list.tsx
function TransactionListItem() { } // internal, not exported
export function TransactionList() { }
```

### Index Files for Clean Exports
```typescript
// src/components/transactions/index.ts
export { TransactionCard } from './transaction-card'
export { TransactionList } from './transaction-list'
export { TransactionForm } from './transaction-form'
```

## Error Handling

### Use Result Types for Actions
```typescript
type ActionResult<T> = 
  | { data: T; error?: never }
  | { data?: never; error: string | Record<string, string[]> }

// Usage in server actions
export async function createTransaction(
  formData: FormData
): Promise<ActionResult<Transaction>> {
  try {
    // ... validation and creation
    return { data: transaction }
  } catch (error) {
    return { error: 'Failed to create transaction' }
  }
}
```

### Throw Only for Unexpected Errors
```typescript
// ✅ Expected errors: return result
if (!user) {
  return { error: 'User not found' }
}

// ✅ Unexpected errors: throw (will be caught by error boundary)
const response = await fetch(url)
if (!response.ok) {
  throw new Error(`API error: ${response.status}`)
}
```

## Performance Guidelines

### Memoization
```typescript
// ✅ Memoize expensive calculations
const sortedTransactions = useMemo(
  () => transactions.sort((a, b) => b.date - a.date),
  [transactions]
)

// ✅ Memoize callbacks passed to child components
const handleClick = useCallback(() => {
  // ...
}, [dependency])

// ❌ Don't memoize everything - it has overhead
const isPositive = useMemo(() => amount > 0, [amount]) // Too simple
```

### Avoid Unnecessary Re-renders
```typescript
// ✅ Lift state up only when necessary
// ✅ Use React.memo for expensive pure components
// ✅ Split components to isolate state

// ❌ Avoid creating new objects/arrays in render
<Component data={{ value: 1 }} /> // New object every render
<Component items={items.filter(x => x)} /> // New array every render
```

## Documentation

### JSDoc for Public Functions
```typescript
/**
 * Formats a number as currency string.
 * 
 * @param amount - The amount to format
 * @param currency - ISO 4217 currency code (e.g., 'UAH', 'USD')
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "₴1,000.00")
 * 
 * @example
 * formatCurrency(1000, 'UAH') // "₴1,000.00"
 * formatCurrency(50.5, 'USD') // "$50.50"
 */
export function formatCurrency(
  amount: number,
  currency: string,
  options?: FormatOptions
): string {
  // ...
}
```

### Self-Documenting Code
```typescript
// ❌ Comment explaining what (obvious from code)
// Increment count by 1
count++

// ✅ Comment explaining why (not obvious)
// Add 1 to account for the header row when calculating pagination
const pageSize = itemsPerPage + 1
```

## Code Smells to Avoid

| Smell | Solution |
|-------|----------|
| **Long functions** (>30 lines) | Extract into smaller functions |
| **Deep nesting** (>3 levels) | Early returns, extract functions |
| **Magic numbers/strings** | Use named constants |
| **Duplicate code** | Extract to shared utilities |
| **God components** | Split by responsibility |
| **Prop drilling** (>2 levels) | Context or composition |
| **Commented-out code** | Delete it (Git has history) |
| **TODO without issue** | Create issue or fix now |

## Cleanup Checklist

When touching a file, check for:

- [ ] Unused imports
- [ ] Unused variables
- [ ] `any` types that could be specific
- [ ] Console.log statements
- [ ] Commented-out code
- [ ] Outdated comments
- [ ] Missing error handling
- [ ] Missing loading states
- [ ] Inconsistent naming
- [ ] Opportunities to extract utilities
- [ ] Test coverage for changes

## Automated Quality Checks

### ESLint Rules (enforced)
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Pre-commit Hooks (via Husky)
```bash
# .husky/pre-commit
pnpm lint-staged
pnpm type-check
```

### lint-staged Configuration
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```
