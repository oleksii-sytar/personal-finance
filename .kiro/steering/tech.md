# Technology Stack

## Current Tech Stack
Based on the environment configuration, this project uses:

### Frontend & Framework
- **Framework**: Next.js (React-based full-stack framework)
- **Build Tool**: Next.js built-in bundler (Webpack/Turbopack)
- **Styling**: Tailwind CSS (recommended for Next.js projects)
- **State Management**: Context API, Zustand, or React Query for server state
- **Charts/Visualization**: Chart.js, Recharts, or D3.js for financial data visualization

### Backend & Database
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: PostgreSQL via Supabase
- **BaaS Provider**: Supabase (Backend-as-a-Service)
- **Authentication**: Supabase Auth (built-in JWT handling)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage (if file uploads needed)

### Development Tools
- **Package Manager**: npm, yarn, or pnpm
- **Linting**: ESLint with Next.js configuration
- **Formatting**: Prettier for code formatting
- **Testing**: Vitest or Jest for unit testing, Playwright for E2E
- **Type Safety**: TypeScript (strongly recommended for financial apps)
- **Database Client**: Supabase JavaScript client
- **ORM**: Prisma (optional, for advanced database operations)

## Environment Configuration
The project uses Supabase for backend services with the following setup:
- **Database**: PostgreSQL hosted on Supabase
- **Connection Pooling**: PgBouncer for efficient database connections
- **Authentication**: Supabase Auth with JWT tokens
- **API**: Supabase auto-generated REST API and real-time subscriptions

## Common Commands

```bash
# Development
npm run dev          # Start Next.js development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database (if using Prisma)
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma Studio

# Testing
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests

# Code Quality
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
```

## Supabase Integration Patterns
- Use Supabase client for database operations
- Implement Row Level Security (RLS) for data protection
- Leverage Supabase Auth for user management
- Use real-time subscriptions for live data updates
- Store sensitive operations in Next.js API routes

## Security Considerations
- All Supabase keys are properly configured for client/server usage
- Implement Row Level Security policies in Supabase
- Use NEXT_PUBLIC_ prefix only for client-safe environment variables
- Validate all financial data on both client and server
- Regular security updates for Next.js and Supabase client