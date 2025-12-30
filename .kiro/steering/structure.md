# Project Structure

## Current Structure
```
personal-finance/
├── .git/                    # Git repository
├── .kiro/                   # Kiro framework integration
│   └── steering/            # AI assistant guidance documents
└── (source files to be created)
```

## Recommended Project Organization

### Next.js Application Structure
```
src/
├── app/                    # Next.js App Router (recommended)
│   ├── (dashboard)/        # Route groups for layout organization
│   │   ├── dashboard/      # Dashboard page
│   │   ├── transactions/   # Transaction management pages
│   │   ├── budget/         # Budget planning pages
│   │   └── reports/        # Financial reports pages
│   ├── auth/              # Authentication pages (login, signup)
│   ├── api/               # API routes for server-side operations
│   │   ├── transactions/   # Transaction CRUD operations
│   │   ├── budgets/        # Budget management
│   │   └── auth/          # Custom auth endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (shadcn/ui style)
│   ├── forms/            # Form-specific components
│   ├── charts/           # Financial visualization components
│   └── layout/           # Layout components (Header, Sidebar, etc.)
├── lib/                  # Utility libraries and configurations
│   ├── supabase/         # Supabase client and utilities
│   ├── utils.ts          # General utility functions
│   ├── validations.ts    # Zod schemas for data validation
│   └── constants.ts      # Application constants
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── styles/               # Additional styling files
```

### Configuration Files (Root Level)
```
├── package.json            # Dependencies and scripts
├── vite.config.js          # Build configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # Styling configuration
├── .eslintrc.js            # Linting rules
├── .prettierrc             # Code formatting rules
├── .gitignore              # Git ignore patterns
└── README.md               # Project documentation
```

## Naming Conventions
- **Components**: PascalCase (e.g., `TransactionList.tsx`)
- **Files/Folders**: camelCase for utilities, PascalCase for components
- **Constants**: UPPER_SNAKE_CASE
- **Functions**: camelCase
- **CSS Classes**: kebab-case or follow Tailwind conventions

## File Organization Principles
- Group related functionality together
- Keep components small and focused
- Separate business logic from UI components
- Use index files for clean imports
- Place shared utilities in dedicated folders

## Import Structure
```javascript
// External libraries first
import React from 'react'
import { useState } from 'react'

// Internal imports (absolute paths preferred)
import { Button } from '@/components/common'
import { formatCurrency } from '@/utils/formatters'
import { Transaction } from '@/types'
```