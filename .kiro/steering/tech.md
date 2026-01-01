# Forma - Technology Stack

## Overview

Forma uses a modern, TypeScript-first stack optimized for rapid development, excellent developer experience, and production-grade reliability.

## Core Technology Stack

### Frontend Framework
- **Next.js 14+** (App Router)
  - React 18+ with Server Components
  - Server Actions for mutations
  - Streaming and Suspense for loading states
  - Built-in image optimization
  - API Routes for serverless functions when needed

### Language
- **TypeScript** (strict mode enabled)
  - All code must be fully typed
  - No `any` types unless absolutely necessary (with justification comment)
  - Use Zod for runtime validation and type inference

### Styling
- **Tailwind CSS** with custom design system
  - Extensive use of `backdrop-blur`, `bg-opacity`, and gradients
  - Custom color palette defined in `tailwind.config.ts`
  - Component-based styling with CSS-in-JS when needed
  - Responsive breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`

### Component Library
- **shadcn/ui** components as base
  - Radix UI primitives for accessibility
  - Customized to match "Executive Lounge" design system
  - Framer Motion for animations

### Icons
- **Lucide React** (preferred)
- Minimalist, thin-stroke style consistent with premium aesthetic

## Backend & Database

### Database & Authentication
- **Supabase** (PostgreSQL)
  - Supabase Auth for user authentication
  - Row Level Security (RLS) for workspace isolation
  - Supabase Realtime for collaborative updates
  - Supabase Storage for future receipt/document uploads
  - Supabase Edge Functions for complex calculations

### Database Conventions
- Use snake_case for table and column names
- All tables must have: `id`, `created_at`, `updated_at`
- Soft deletes using `deleted_at` column when appropriate
- Foreign keys with proper cascading rules
- RLS policies on all user-facing tables

## Deployment & Infrastructure

### Hosting
- **Vercel** for frontend deployment
  - Automatic preview deployments on PR
  - Production deployment on main branch merge
  - Edge Functions for performance

### Environment Management
- **Development**: Cloud Supabase (single environment)
- **Preview**: Same Cloud Supabase (PR deployments)
- **Future Production**: Separate Supabase project (when ready)

## Development Tools

### Package Manager
- **pnpm** (preferred for monorepo efficiency)

### Linting & Formatting
- **ESLint** with strict TypeScript rules
- **Prettier** for consistent formatting
- **Husky** for pre-commit hooks

### Testing
- **Vitest** for unit tests
- **Playwright** for E2E tests
- **React Testing Library** for component tests

### Version Control
- **Git** with conventional commits
- Branch naming: `feature/`, `fix/`, `chore/`, `docs/`

## External Integrations

### Exchange Rates
- **National Bank of Ukraine (NBU) API**
  - Base URL: `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange`
  - No authentication required
  - Cache rates in database (fetch once per day per currency)
  - Fallback to most recent cached rate if API unavailable

### Future Integrations (Out of Scope v1)
- Plaid/bank connections (privacy-first approach)
- Email service for transactional emails

## CLI Tools Reference

### Supabase CLI
```bash
# Check project status
supabase status

# Generate TypeScript types from database
supabase gen types typescript > src/types/database.ts

# Create a new migration
supabase migration new <migration_name>

# Apply migrations to cloud database
supabase db push

# Pull schema from remote
supabase db pull

# Link to remote project
supabase link --project-ref <project-ref>

# Deploy Edge Functions
supabase functions deploy <function_name>
```

### Vercel CLI
```bash
# Login to Vercel
vercel login

# Deploy preview
vercel

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull .env.local

# View deployment logs
vercel logs <deployment-url>

# Run local dev server
vercel dev
```

### Package Scripts
```bash
# Development
pnpm dev

# Build
pnpm build

# Start production server locally
pnpm start

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Type checking
pnpm type-check

# Linting
pnpm lint

# Generate Supabase types
pnpm db:types
```

## Code Patterns

### API Pattern
- Use Server Actions for mutations
- Use React Query (TanStack Query) for client-side data fetching
- Implement optimistic updates for better UX

### State Management
- React Context for global UI state (theme, modals)
- React Query for server state
- Zustand for complex client state if needed
- URL state for filters/pagination

### Error Handling
- Zod validation at API boundaries
- Custom error classes for business logic errors
- Error boundaries for graceful UI fallbacks
- Toast notifications for user feedback

### Security
- All database operations through RLS
- Input sanitization on all user inputs
- CSRF protection via Supabase Auth
- Content Security Policy headers

## Performance Guidelines

- Target Lighthouse score: >90 on all categories
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Use React Suspense for code splitting
- Implement virtual scrolling for long lists
- Optimize images with Next.js Image component
