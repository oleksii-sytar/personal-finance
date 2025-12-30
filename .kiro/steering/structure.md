# Forma - Project Structure

## Overview

This document defines the file organization, naming conventions, import patterns, and architectural decisions for the Forma project.

## Root Directory Structure

```
forma/
├── .kiro/                    # Kiro steering files and specs
│   ├── steering/             # Steering documents
│   │   ├── product.md
│   │   ├── tech.md
│   │   ├── structure.md
│   │   ├── testing.md
│   │   ├── deployment.md
│   │   ├── feature-flags.md
│   │   ├── code-quality.md
│   │   ├── issue-resolution.md
│   │   ├── git-workflow.md
│   │   └── integrations.md
│   └── specs/                # Feature specifications
│       └── [feature-name]/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── src/                      # Source code
├── public/                   # Static assets
├── supabase/                 # Supabase configuration
├── tests/                    # Test files
├── docs/                     # Documentation
└── [config files]            # Root configuration
```

## Source Directory Structure (`src/`)

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth routes group (login, register)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── transactions/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   ├── accounts/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/                  # API routes (when needed)
│   │   └── [route]/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── ui/                   # Base UI components (shadcn/ui style)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── forms/                # Form components
│   │   ├── transaction-form.tsx
│   │   ├── category-form.tsx
│   │   └── ...
│   ├── layout/               # Layout components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── mobile-nav.tsx
│   │   └── ...
│   ├── dashboard/            # Dashboard-specific components
│   │   ├── balance-card.tsx
│   │   ├── recent-transactions.tsx
│   │   ├── forecast-chart.tsx
│   │   └── ...
│   ├── transactions/         # Transaction-specific components
│   │   ├── transaction-list.tsx
│   │   ├── transaction-item.tsx
│   │   ├── transaction-filters.tsx
│   │   └── ...
│   └── shared/               # Shared/reusable components
│       ├── currency-display.tsx
│       ├── date-picker.tsx
│       ├── loading-spinner.tsx
│       └── ...
├── lib/                      # Utility libraries
│   ├── supabase/             # Supabase client configuration
│   │   ├── client.ts         # Browser client
│   │   ├── server.ts         # Server client
│   │   ├── middleware.ts     # Auth middleware
│   │   └── admin.ts          # Admin client (server-only)
│   ├── utils/                # Utility functions
│   │   ├── format.ts         # Formatting utilities
│   │   ├── currency.ts       # Currency conversion
│   │   ├── date.ts           # Date utilities
│   │   └── ...
│   ├── validations/          # Zod schemas
│   │   ├── transaction.ts
│   │   ├── category.ts
│   │   ├── account.ts
│   │   └── ...
│   └── constants/            # App constants
│       ├── currencies.ts
│       ├── categories.ts
│       └── ...
├── hooks/                    # Custom React hooks
│   ├── use-transactions.ts
│   ├── use-categories.ts
│   ├── use-accounts.ts
│   ├── use-forecast.ts
│   └── ...
├── actions/                  # Server Actions
│   ├── transactions.ts
│   ├── categories.ts
│   ├── accounts.ts
│   └── ...
├── types/                    # TypeScript types
│   ├── database.ts           # Generated Supabase types
│   ├── index.ts              # Custom types
│   └── ...
├── stores/                   # Client state stores (Zustand)
│   ├── ui-store.ts
│   └── ...
└── config/                   # App configuration
    ├── site.ts               # Site metadata
    ├── navigation.ts         # Navigation config
    └── ...
```

## Supabase Directory Structure

```
supabase/
├── config.toml               # Supabase configuration
├── migrations/               # Database migrations
│   ├── 00000000000000_init.sql
│   ├── 20241201000000_create_workspaces.sql
│   └── ...
├── seed.sql                  # Seed data (development)
└── functions/                # Edge Functions
    ├── calculate-forecast/
    │   └── index.ts
    ├── sync-exchange-rates/
    │   └── index.ts
    └── ...
```

## Test Directory Structure

```
tests/
├── unit/                     # Unit tests
│   ├── utils/
│   ├── hooks/
│   └── ...
├── integration/              # Integration tests
│   ├── actions/
│   └── ...
├── e2e/                      # End-to-end tests (Playwright)
│   ├── auth.spec.ts
│   ├── transactions.spec.ts
│   └── ...
└── fixtures/                 # Test fixtures and mocks
    ├── transactions.ts
    ├── users.ts
    └── ...
```

## Naming Conventions

### Files and Directories
- **Directories**: `kebab-case` (e.g., `transaction-list`, `use-transactions`)
- **React Components**: `kebab-case.tsx` (e.g., `balance-card.tsx`)
- **Utilities/Functions**: `kebab-case.ts` (e.g., `format-currency.ts`)
- **Types**: `kebab-case.ts` (e.g., `database.ts`)
- **Hooks**: `use-*.ts` (e.g., `use-transactions.ts`)
- **Server Actions**: Feature-based (e.g., `transactions.ts`)

### Code Naming
- **Components**: `PascalCase` (e.g., `BalanceCard`, `TransactionList`)
- **Functions**: `camelCase` (e.g., `formatCurrency`, `calculateForecast`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_CURRENCY`, `MAX_TRANSACTIONS`)
- **Types/Interfaces**: `PascalCase` (e.g., `Transaction`, `UserProfile`)
- **Hooks**: `useCamelCase` (e.g., `useTransactions`, `useAuth`)

### Database Naming
- **Tables**: `snake_case` plural (e.g., `transactions`, `categories`)
- **Columns**: `snake_case` (e.g., `created_at`, `transaction_date`)
- **Foreign Keys**: `<table_singular>_id` (e.g., `category_id`, `user_id`)

## Import Patterns

### Import Order
```typescript
// 1. React/Next imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { z } from 'zod'
import { format } from 'date-fns'

// 3. Local components (absolute imports)
import { Button } from '@/components/ui/button'
import { TransactionList } from '@/components/transactions/transaction-list'

// 4. Hooks
import { useTransactions } from '@/hooks/use-transactions'

// 5. Utilities
import { formatCurrency } from '@/lib/utils/format'

// 6. Types
import type { Transaction } from '@/types'

// 7. Styles (if any)
import './styles.css'
```

### Absolute Imports
Use `@/` prefix for all absolute imports:
```typescript
// tsconfig.json paths
"paths": {
  "@/*": ["./src/*"]
}
```

## Component Structure

### Standard Component Template
```typescript
// 1. Imports
import { type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// 2. Types
interface BalanceCardProps {
  balance: number
  currency: string
  className?: string
}

// 3. Component
export function BalanceCard({ 
  balance, 
  currency, 
  className 
}: BalanceCardProps) {
  // Hooks
  
  // Derived state
  
  // Handlers
  
  // Render
  return (
    <div className={cn('...', className)}>
      {/* content */}
    </div>
  )
}
```

## Page Structure

### Standard Page Template
```typescript
// src/app/(dashboard)/transactions/page.tsx

import { Suspense } from 'react'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionListSkeleton } from '@/components/transactions/transaction-list-skeleton'

export const metadata = {
  title: 'Transactions | Forma',
}

export default async function TransactionsPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      <Suspense fallback={<TransactionListSkeleton />}>
        <TransactionList />
      </Suspense>
    </div>
  )
}
```

## Server Actions Structure

```typescript
// src/actions/transactions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { transactionSchema } from '@/lib/validations/transaction'
import type { ActionResult } from '@/types'

export async function createTransaction(
  formData: FormData
): Promise<ActionResult<Transaction>> {
  const supabase = await createClient()
  
  // Validate
  const validated = transactionSchema.safeParse(Object.fromEntries(formData))
  if (!validated.success) {
    return { error: validated.error.flatten() }
  }
  
  // Execute
  const { data, error } = await supabase
    .from('transactions')
    .insert(validated.data)
    .select()
    .single()
    
  if (error) {
    return { error: error.message }
  }
  
  revalidatePath('/transactions')
  return { data }
}
```

## Key Architectural Decisions

1. **App Router**: Use Next.js App Router for all routing
2. **Server Components**: Default to Server Components, use Client Components only when needed
3. **Server Actions**: Use for all mutations (forms, deletions, updates)
4. **React Query**: Use for client-side data fetching and caching
5. **Supabase RLS**: All data access goes through RLS policies
6. **Feature-based Organization**: Components grouped by feature, not type
7. **Colocation**: Keep related files close together (styles, tests, types)
