# Design Document: Accounts Management

## Overview

The Accounts Management system provides a comprehensive UI and business logic layer for managing financial accounts within Forma. This feature enables users to create, view, edit, and delete accounts while maintaining accurate balance calculations through transaction integration. The system is designed with a mobile-first approach using the Executive Lounge aesthetic, featuring glass cards, warm colors, and smooth interactions.

### Key Design Goals

1. **Intuitive Account Management**: Provide a clean, accessible interface for CRUD operations on accounts
2. **Accurate Balance Tracking**: Ensure real-time balance calculations based on transaction history
3. **Seamless Integration**: Work harmoniously with existing checkpoint and transaction systems
4. **Mobile-First Responsive**: Optimize for iPhone 15/16 Pro with graceful scaling to larger screens
5. **Executive Lounge Aesthetic**: Maintain the premium glass-and-leather design language throughout

### Architecture Approach

The system follows a layered architecture:
- **Presentation Layer**: React components with Tailwind CSS styling
- **Business Logic Layer**: Server Actions for data mutations and queries
- **Data Layer**: Supabase PostgreSQL with Row Level Security (RLS)
- **Integration Layer**: Hooks and utilities for cross-feature communication

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
├─────────────────────────────────────────────────────────────┤
│  AccountsPage          │  Account Management Dashboard       │
│  AccountCard           │  Individual account display         │
│  AccountForm           │  Create/Edit account form           │
│  AccountSelector       │  Dropdown for transaction selection │
│  AccountSummary        │  Multi-account overview widget      │
│  DeleteAccountDialog   │  Confirmation dialog for deletion   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Server Actions (src/actions/accounts.ts)                   │
│  - createAccount()     │  Create new account                │
│  - getAccounts()       │  Fetch workspace accounts          │
│  - updateAccount()     │  Update account details            │
│  - deleteAccount()     │  Delete account (with validation)  │
│  - getOrCreateDefaultAccount() │ Ensure default exists      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL                                         │
│  - accounts table      │  Account records                   │
│  - transactions table  │  Transaction records (FK)          │
│  - checkpoints table   │  Checkpoint records (FK)           │
│  RLS Policies          │  Workspace-based isolation         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Account Creation Flow
```
User Input → AccountForm → Validation → createAccount() 
  → Supabase Insert → RLS Check → Success/Error Response 
  → UI Update → Revalidate Cache
```

#### Balance Calculation Flow
```
Transaction Change → Trigger Balance Recalculation 
  → Sum(income) - Sum(expenses) + initial_balance 
  → Update Account Display → Propagate to Dashboard
```

#### Account Deletion Flow
```
Delete Request → Check Transaction Count → If count > 0: Reject 
  → If count = 0: Show Confirmation → User Confirms 
  → deleteAccount() → Cascade Check → Delete Record 
  → UI Update
```

## Components and Interfaces

### Core Components

#### 1. AccountsPage (Main Dashboard)
**Location**: `src/app/(dashboard)/accounts/page.tsx`

**Purpose**: Main entry point for account management, displays all accounts with summary statistics.

**Key Features**:
- Server Component for initial data fetch
- Displays AccountSummary widget at top
- Grid layout of AccountCard components
- Floating "Add Account" button (bottom-right on mobile)
- Empty state for first-time users

**Props**: None (fetches data server-side)

**Layout**:
```tsx
<div className="container py-6">
  <AccountSummary accounts={accounts} />
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
    {accounts.map(account => (
      <AccountCard key={account.id} account={account} />
    ))}
  </div>
  <FloatingActionButton onClick={handleAddAccount} />
</div>
```

#### 2. AccountCard (Individual Account Display)
**Location**: `src/components/accounts/account-card.tsx`

**Purpose**: Display individual account with balance, type indicator, and action buttons.

**Props**:
```typescript
interface AccountCardProps {
  account: Account
  onEdit?: (accountId: string) => void
  onDelete?: (accountId: string) => void
  className?: string
}
```

**Design**:
- Glass card with Executive Lounge styling
- Account type icon (top-left)
- Account name (heading)
- Balance (large, prominent, formatted with currency)
- Account type label (secondary text)
- Edit/Delete buttons (hover reveal on desktop, always visible on mobile)
- Negative balance indicator (red tint for credit/debt)

**Styling**:
```css
.account-card {
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass);
  border-radius: 20px;
  padding: 24px;
  transition: all 300ms ease;
}

.account-card:hover {
  box-shadow: 0 8px 32px -8px var(--shadow-elevated);
  transform: translateY(-2px);
}
```

#### 3. AccountForm (Create/Edit Form)
**Location**: `src/components/accounts/account-form.tsx`

**Purpose**: Form for creating new accounts or editing existing ones.

**Props**:
```typescript
interface AccountFormProps {
  account?: Account // undefined for create, populated for edit
  onSuccess?: () => void
  onCancel?: () => void
}
```

**Fields**:
- Account Name (text input, max 100 chars, required)
- Account Type (dropdown: checking, savings, credit, investment)
- Initial Balance (number input, optional, only shown on create)
- Currency (read-only, inherited from workspace)

**Validation**:
- Client-side: Zod schema validation
- Server-side: Duplicate validation in Server Action
- Real-time feedback on input blur

**Form Schema**:
```typescript
const accountFormSchema = z.object({
  name: z.string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must be 100 characters or less'),
  type: z.enum(['checking', 'savings', 'credit', 'investment'], {
    errorMap: () => ({ message: 'Please select a valid account type' })
  }),
  initial_balance: z.coerce.number()
    .optional()
    .default(0)
    .refine(val => !isNaN(val), 'Initial balance must be a valid number'),
})
```

#### 4. AccountSelector (Transaction Integration)
**Location**: `src/components/accounts/account-selector.tsx`

**Purpose**: Dropdown selector for choosing account when creating/editing transactions.

**Props**:
```typescript
interface AccountSelectorProps {
  value?: string // selected account ID
  onChange: (accountId: string) => void
  workspaceId: string
  className?: string
}
```

**Features**:
- Fetches accounts for workspace
- Displays account name + type icon
- Shows default account indicator
- Keyboard navigation support
- Mobile-optimized touch targets (min 44px height)

**Implementation**:
```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger className="form-input">
    <SelectValue placeholder="Select account" />
  </SelectTrigger>
  <SelectContent>
    {accounts.map(account => (
      <SelectItem key={account.id} value={account.id}>
        <div className="flex items-center gap-2">
          <AccountTypeIcon type={account.type} />
          <span>{account.name}</span>
          {account.is_default && (
            <Badge variant="outline" className="text-xs">Default</Badge>
          )}
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### 5. AccountSummary (Dashboard Widget)
**Location**: `src/components/accounts/account-summary.tsx`

**Purpose**: Display aggregate statistics across all accounts.

**Props**:
```typescript
interface AccountSummaryProps {
  accounts: Account[]
  className?: string
}
```

**Displays**:
- Total balance (sum of all accounts in workspace currency)
- Account count by type (e.g., "2 Checking, 1 Savings, 1 Credit")
- Debt indicator (if any accounts have negative balance)
- Quick "Add Account" action

**Layout**:
```tsx
<div className="glass-card p-6">
  <div className="flex justify-between items-start">
    <div>
      <h2 className="text-sm text-secondary">Total Balance</h2>
      <p className="text-3xl font-bold text-primary mt-1">
        {formatCurrency(totalBalance, currency)}
      </p>
      <p className="text-sm text-secondary mt-2">
        {accountTypeSummary}
      </p>
    </div>
    <Button variant="secondary" size="sm" onClick={onAddAccount}>
      <PlusIcon className="w-4 h-4" />
    </Button>
  </div>
  {hasDebt && (
    <div className="mt-4 p-3 bg-accent-error/10 rounded-lg">
      <p className="text-sm text-accent-error">
        You have {debtAccountCount} account(s) with negative balance
      </p>
    </div>
  )}
</div>
```

#### 6. DeleteAccountDialog (Confirmation Modal)
**Location**: `src/components/accounts/delete-account-dialog.tsx`

**Purpose**: Confirmation dialog for account deletion with transaction check.

**Props**:
```typescript
interface DeleteAccountDialogProps {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}
```

**Behavior**:
- Checks transaction count before showing
- If transactions exist: Shows error message, prevents deletion
- If no transactions: Shows confirmation with warning
- Requires explicit "Delete" button click
- Shows loading state during deletion

**Content**:
```tsx
{hasTransactions ? (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Cannot Delete Account</DialogTitle>
      <DialogDescription>
        This account has {transactionCount} transaction(s) and cannot be deleted.
        You must delete all transactions first.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="secondary" onClick={() => onOpenChange(false)}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
) : (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Account?</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete "{account.name}"? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="secondary" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? 'Deleting...' : 'Delete Account'}
      </Button>
    </DialogFooter>
  </DialogContent>
)}
```

### Utility Components

#### AccountTypeIcon
**Location**: `src/components/accounts/account-type-icon.tsx`

**Purpose**: Display appropriate icon for account type.

**Props**:
```typescript
interface AccountTypeIconProps {
  type: AccountType
  className?: string
}
```

**Icon Mapping**:
- `checking`: Wallet icon (Lucide `Wallet`)
- `savings`: Piggy bank icon (Lucide `PiggyBank`)
- `credit`: Credit card icon (Lucide `CreditCard`)
- `investment`: Trending up icon (Lucide `TrendingUp`)

**Styling**: Icons use accent colors from Executive Lounge palette

#### AccountTypeBadge
**Location**: `src/components/accounts/account-type-badge.tsx`

**Purpose**: Display account type as a styled badge.

**Props**:
```typescript
interface AccountTypeBadgeProps {
  type: AccountType
  className?: string
}
```

**Styling**: Uses glass background with type-specific accent color

## Data Models

### Account Interface

```typescript
interface Account {
  id: string                    // UUID primary key
  workspace_id: string          // FK to workspaces table
  name: string                  // Account name (max 100 chars)
  type: AccountType             // Account type enum
  balance: number               // Current balance (calculated)
  currency: string              // ISO 4217 currency code (inherited from workspace)
  initial_balance: number       // Starting balance at account creation
  is_default: boolean           // Whether this is the default account
  created_at: string            // ISO timestamp
  updated_at: string            // ISO timestamp
}

type AccountType = 'checking' | 'savings' | 'credit' | 'investment'
```

### Database Schema

```sql
-- accounts table (already exists)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'investment')),
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL,
  initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_accounts_workspace_id ON accounts(workspace_id);
CREATE INDEX idx_accounts_type ON accounts(type);

-- RLS Policies (workspace isolation)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accounts in their workspaces"
  ON accounts FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create accounts in their workspaces"
  ON accounts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update accounts in their workspaces"
  ON accounts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete accounts in their workspaces"
  ON accounts FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid()
    )
  );
```

### Form Data Types

```typescript
// Create account form data
interface CreateAccountFormData {
  name: string
  type: AccountType
  initial_balance?: number
}

// Update account form data
interface UpdateAccountFormData {
  name: string
  type: AccountType
}

// Account with transaction count (for deletion check)
interface AccountWithTransactionCount extends Account {
  transaction_count: number
}

// Account summary statistics
interface AccountSummary {
  total_balance: number
  account_counts: Record<AccountType, number>
  debt_accounts: Account[]
  total_accounts: number
}
```

### Server Action Response Types

```typescript
type ActionResult<T> = 
  | { data: T; error?: never }
  | { data?: never; error: string | Record<string, string[]> }

// Server action return types
type CreateAccountResult = ActionResult<Account>
type GetAccountsResult = ActionResult<Account[]>
type UpdateAccountResult = ActionResult<Account>
type DeleteAccountResult = ActionResult<{ success: boolean }>
type GetOrCreateDefaultAccountResult = ActionResult<Account>
```

## Integration Points

### 1. Transaction System Integration

**Location**: Transaction form components

**Integration Method**: AccountSelector component

**Data Flow**:
```
TransactionForm → AccountSelector → getAccounts() 
  → Display accounts → User selects → Store account_id in transaction
```

**Key Considerations**:
- Default account is pre-selected if no account specified
- Account selector shows account name + type for clarity
- Transaction creation updates account balance automatically

### 2. Checkpoint System Integration

**Location**: Checkpoint creation modal

**Integration Method**: Account list in checkpoint form

**Data Flow**:
```
CheckpointModal → getAccounts() → Display account list 
  → User enters actual balance per account → Store in checkpoint_accounts table
```

**Key Considerations**:
- Checkpoint modal displays all accounts with current calculated balance
- User enters actual balance for reconciliation
- Gap calculation: actual_balance - calculated_balance per account
- Checkpoint history shows per-account reconciliation data

**Implementation**:
```typescript
// In checkpoint creation modal
const accounts = await getAccounts(workspaceId)

// Display each account with input for actual balance
{accounts.map(account => (
  <div key={account.id} className="flex justify-between items-center">
    <div>
      <p className="font-medium">{account.name}</p>
      <p className="text-sm text-secondary">
        Current: {formatCurrency(account.balance, account.currency)}
      </p>
    </div>
    <Input
      type="number"
      step="0.01"
      placeholder="Actual balance"
      name={`account_${account.id}_balance`}
    />
  </div>
))}
```

### 3. Dashboard Integration

**Location**: Main dashboard page

**Integration Method**: AccountSummary widget

**Data Flow**:
```
Dashboard → getAccounts() → Calculate summary stats 
  → Display AccountSummary widget
```

**Key Considerations**:
- Summary widget shows total balance across all accounts
- Highlights debt accounts (negative balances)
- Provides quick access to account management

### 4. Balance Calculation Integration

**Location**: Transaction server actions

**Integration Method**: Automatic balance updates

**Data Flow**:
```
Transaction Created/Updated/Deleted → Trigger balance recalculation 
  → Update account.balance → Propagate to UI
```

**Implementation**:
```typescript
// In transaction server actions
async function updateAccountBalance(accountId: string) {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('account_id', accountId)
  
  const balance = transactions.reduce((sum, tx) => {
    return tx.type === 'income' 
      ? sum + tx.amount 
      : sum - tx.amount
  }, 0)
  
  await supabase
    .from('accounts')
    .update({ balance, updated_at: new Date().toISOString() })
    .eq('id', accountId)
}
```

## Error Handling

### Validation Errors

**Client-Side Validation**:
- Zod schema validation on form submission
- Real-time validation on input blur
- Clear, specific error messages below each field

**Server-Side Validation**:
- Duplicate validation in Server Actions
- Database constraint validation
- RLS policy enforcement

**Error Display**:
```tsx
{errors.name && (
  <p className="text-sm text-accent-error mt-1">
    {errors.name.message}
  </p>
)}
```

### Business Logic Errors

**Account Deletion with Transactions**:
```typescript
// In deleteAccount server action
const { count } = await supabase
  .from('transactions')
  .select('*', { count: 'exact', head: true })
  .eq('account_id', accountId)

if (count > 0) {
  return { 
    error: `Cannot delete account with ${count} transaction(s). Delete transactions first.` 
  }
}
```

**Default Account Protection**:
```typescript
// Prevent deletion of default account if it's the only account
const { count: accountCount } = await supabase
  .from('accounts')
  .select('*', { count: 'exact', head: true })
  .eq('workspace_id', workspaceId)

if (accountCount === 1 && account.is_default) {
  return { 
    error: 'Cannot delete the only account in workspace. Create another account first.' 
  }
}
```

### Network Errors

**Handling**:
- Toast notifications for network failures
- Retry mechanism for transient failures
- Graceful degradation with cached data

**Implementation**:
```typescript
try {
  const result = await createAccount(formData)
  if (result.error) {
    toast.error(result.error)
  } else {
    toast.success('Account created successfully')
    router.refresh()
  }
} catch (error) {
  toast.error('Network error. Please try again.')
  console.error('Account creation failed:', error)
}
```

## Testing Strategy

### Unit Tests

**Location**: `tests/unit/components/accounts/`

**Coverage**:
- AccountCard rendering with different account types
- AccountForm validation logic
- AccountSelector dropdown behavior
- AccountSummary calculations
- AccountTypeIcon mapping
- Currency formatting utilities

**Example Test**:
```typescript
describe('AccountCard', () => {
  it('displays account name and balance', () => {
    const account = createMockAccount({ 
      name: 'Checking', 
      balance: 1000,
      currency: 'UAH'
    })
    
    render(<AccountCard account={account} />)
    
    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('₴1,000.00')).toBeInTheDocument()
  })
  
  it('shows negative balance indicator for credit accounts', () => {
    const account = createMockAccount({ 
      type: 'credit',
      balance: -500 
    })
    
    render(<AccountCard account={account} />)
    
    expect(screen.getByText('-₴500.00')).toHaveClass('text-accent-error')
  })
})
```

### Integration Tests

**Location**: `tests/integration/actions/accounts.test.ts`

**Coverage**:
- createAccount server action with database
- getAccounts with RLS policies
- updateAccount with validation
- deleteAccount with transaction check
- Balance calculation after transaction changes

**Example Test**:
```typescript
describe('Account Actions', () => {
  let userId: string
  let workspaceId: string

  beforeEach(async () => {
    const user = await createTestUser()
    const workspace = await createTestWorkspace(user.id)
    userId = user.id
    workspaceId = workspace.id
  })

  it('creates account successfully', async () => {
    const formData = new FormData()
    formData.set('name', 'Test Checking')
    formData.set('type', 'checking')
    formData.set('initial_balance', '1000')
    formData.set('workspace_id', workspaceId)

    const result = await createAccount(formData)

    expect(result.error).toBeUndefined()
    expect(result.data).toMatchObject({
      name: 'Test Checking',
      type: 'checking',
      balance: 1000,
    })
  })

  it('prevents deletion of account with transactions', async () => {
    const account = await createTestAccount(workspaceId)
    await createTestTransaction({ account_id: account.id })

    const result = await deleteAccount(account.id)

    expect(result.error).toContain('Cannot delete account with')
  })
})
```

### End-to-End Tests

**Location**: `tests/e2e/accounts.spec.ts`

**Coverage**:
- Complete account creation flow
- Account editing flow
- Account deletion flow (with and without transactions)
- Account selection in transaction form
- Multi-account dashboard display

**Example Test**:
```typescript
test('can create and delete an account', async ({ page }) => {
  await page.goto('/accounts')
  
  // Create account
  await page.click('button:has-text("Add Account")')
  await page.fill('[name="name"]', 'Test Savings')
  await page.selectOption('[name="type"]', 'savings')
  await page.fill('[name="initial_balance"]', '5000')
  await page.click('button[type="submit"]')
  
  await expect(page.locator('text=Test Savings')).toBeVisible()
  await expect(page.locator('text=₴5,000.00')).toBeVisible()
  
  // Delete account (no transactions)
  await page.click('[data-testid="account-card-Test Savings"] button:has-text("Delete")')
  await page.click('button:has-text("Delete Account")')
  
  await expect(page.locator('text=Test Savings')).not.toBeVisible()
})
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas where properties can be consolidated:

**Redundancy Analysis**:
1. Properties 1.2, 9.1, and 9.2 all test account name validation - these can be combined into a single comprehensive validation property
2. Properties 1.3 and 9.3 both test account type validation - these can be combined
3. Properties 6.2, 6.3, and 6.4 all test balance recalculation - these can be combined into a single property about balance consistency
4. Properties 2.2 and 5.4 both test that account information is displayed completely - these can be combined
5. Properties 3.2 and 3.3 both test account updates - these can be combined into a single update property

**Consolidated Properties**:
The following properties represent the unique, non-redundant validation requirements for the accounts management system.

### Core Account Management Properties

**Property 1: Account Name Validation**
*For any* account creation or update attempt, the account name must be non-empty, contain no leading/trailing whitespace, and not exceed 100 characters, otherwise the system should reject the operation with a specific validation error.

**Validates: Requirements 1.2, 9.1, 9.2**

---

**Property 2: Account Type Validation**
*For any* account creation or update attempt, the account type must be one of the valid types (checking, savings, credit, investment), otherwise the system should reject the operation with a validation error.

**Validates: Requirements 1.3, 9.3**

---

**Property 3: Initial Balance Handling**
*For any* account creation, if no initial balance is provided, the account should be created with a balance of 0, and if an initial balance is provided, it should be stored as both initial_balance and balance fields.

**Validates: Requirements 1.4, 9.4**

---

**Property 4: Currency Inheritance**
*For any* account created in a workspace, the account's currency should match the workspace's default currency.

**Validates: Requirements 1.5**

---

**Property 5: Timestamp Recording**
*For any* account creation, the system should automatically set created_at to the current timestamp, and for any account update, the system should automatically update updated_at to the current timestamp.

**Validates: Requirements 1.6, 3.6**

---

**Property 6: Default Account Assignment**
*For any* workspace, when the first account is created, it should be marked as is_default = true, and when subsequent accounts are created, they should be marked as is_default = false.

**Validates: Requirements 1.7**

---

### Account Display Properties

**Property 7: Complete Account List Retrieval**
*For any* workspace with N accounts, querying the accounts list should return exactly N accounts, all belonging to that workspace.

**Validates: Requirements 2.1**

---

**Property 8: Account Information Completeness**
*For any* account displayed in the UI (list, card, or selector), the rendered output should contain the account name, type, balance, and currency.

**Validates: Requirements 2.2, 5.4**

---

**Property 9: Currency Formatting Consistency**
*For any* account balance displayed, the formatting should match the account's currency code (e.g., UAH displays as "₴X,XXX.XX", USD as "$X,XXX.XX").

**Validates: Requirements 2.3, 6.5**

---

**Property 10: Chronological Ordering**
*For any* accounts list, accounts should be ordered by created_at timestamp in ascending order (oldest first).

**Validates: Requirements 2.4**

---

**Property 11: Account Type Label Mapping**
*For any* account type, the system should display the correct user-friendly label: checking → "Checking Account", savings → "Savings Account", credit → "Credit Account", investment → "Investment Account".

**Validates: Requirements 2.6**

---

### Account Update Properties

**Property 12: Account Update Persistence**
*For any* account, when the name or type is updated, the changes should persist in the database and be reflected in all subsequent queries.

**Validates: Requirements 3.2, 3.3**

---

### Account Deletion Properties

**Property 13: Transaction-Based Deletion Prevention**
*For any* account with one or more transactions, deletion attempts should be rejected with an error message indicating the number of transactions that must be deleted first.

**Validates: Requirements 4.2, 4.3**

---

**Property 14: Clean Account Deletion**
*For any* account with zero transactions, deletion should succeed and the account should no longer appear in any subsequent queries.

**Validates: Requirements 4.4, 4.6**

---

### Transaction Integration Properties

**Property 15: Account Selector Completeness**
*For any* workspace with N accounts, the account selector in the transaction form should display all N accounts with their names and types.

**Validates: Requirements 5.2**

---

**Property 16: Default Account Selection**
*For any* transaction created without an explicit account selection, the transaction should be associated with the workspace's default account (is_default = true).

**Validates: Requirements 5.3**

---

**Property 17: Transaction-Account Association Persistence**
*For any* transaction created with a specific account, the account_id should persist unchanged throughout the transaction's lifetime (unless explicitly updated).

**Validates: Requirements 5.5**

---

### Balance Calculation Properties

**Property 18: Balance Calculation Correctness**
*For any* account, the displayed balance should equal: initial_balance + sum(income transactions) - sum(expense transactions) for that account.

**Validates: Requirements 6.1**

---

**Property 19: Balance Consistency After Transaction Changes**
*For any* account, after adding, updating, or deleting a transaction, the account balance should be recalculated and match the formula: initial_balance + sum(income) - sum(expense).

**Validates: Requirements 6.2, 6.3, 6.4**

---

### Account Summary Properties

**Property 20: Total Balance Aggregation**
*For any* workspace with accounts [A1, A2, ..., An], the total balance displayed should equal sum(A1.balance, A2.balance, ..., An.balance).

**Validates: Requirements 8.1, 8.2**

---

**Property 21: Account Type Counting**
*For any* workspace, the account summary should display accurate counts for each account type: count(checking), count(savings), count(credit), count(investment).

**Validates: Requirements 8.3**

---

**Property 22: Debt Account Identification**
*For any* workspace, the accounts summary should identify and highlight all accounts where balance < 0.

**Validates: Requirements 8.4**

---

### Validation Error Properties

**Property 23: Validation Error Specificity**
*For any* validation failure (empty name, name too long, invalid type, invalid balance), the system should return a specific error message indicating which field failed and why.

**Validates: Requirements 9.5**

---

### Checkpoint Integration Properties

**Property 24: Checkpoint Account Inclusion**
*For any* checkpoint creation, all active accounts in the workspace should be displayed for balance entry.

**Validates: Requirements 10.1**

---

**Property 25: Checkpoint Reference Balance Display**
*For any* account in a checkpoint form, the current calculated balance should be displayed alongside the input field for actual balance entry.

**Validates: Requirements 10.2**

---

**Property 26: Checkpoint Per-Account Balance Storage**
*For any* checkpoint created, the actual balance for each account should be stored separately in the checkpoint_accounts table.

**Validates: Requirements 10.3**

---

**Property 27: Per-Account Reconciliation Gap Calculation**
*For any* checkpoint, the reconciliation gap for each account should be calculated as: actual_balance - calculated_balance, not as a single total gap.

**Validates: Requirements 10.4**

---

**Property 28: Checkpoint History Account Preservation**
*For any* checkpoint in history, the system should display which accounts were included and their actual vs calculated balances at that point in time.

**Validates: Requirements 10.5**

---

### Property-Based Testing Implementation Notes

**Testing Framework**: Use Vitest with fast-check for property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test should reference its design property number
- Tag format: `Feature: accounts-management, Property N: [property description]`

**Generator Strategies**:
```typescript
// Example generators for property-based tests
const accountNameGen = fc.string({ minLength: 1, maxLength: 100 })
const accountTypeGen = fc.constantFrom('checking', 'savings', 'credit', 'investment')
const balanceGen = fc.double({ min: -1000000, max: 1000000, noNaN: true })
const currencyGen = fc.constantFrom('UAH', 'USD', 'EUR')

const accountGen = fc.record({
  name: accountNameGen,
  type: accountTypeGen,
  initial_balance: balanceGen,
  currency: currencyGen,
})
```

**Edge Cases to Cover**:
- Empty workspaces (no accounts)
- Single account workspaces
- Accounts with zero balance
- Accounts with negative balance (credit/debt)
- Accounts with very large balances (boundary testing)
- Accounts with many transactions (performance)
- Concurrent account operations (race conditions)

