# Forma - Personal Finance Management

A modern, privacy-first personal finance management application built for families.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Visit http://localhost:3000

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
npm run test         # Run tests
npm run deploy       # Deploy to production
```

## Database Management

```bash
npm run db:types     # Generate TypeScript types from database
npm run db:push      # Apply migrations to database
```

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
├── actions/          # Server actions
├── lib/              # Utilities and configurations
├── hooks/            # Custom React hooks
└── types/            # TypeScript type definitions

supabase/
├── migrations/       # Database migrations
└── functions/        # Edge functions
```

## Features

- Multi-workspace support
- Transaction management
- Category organization
- Recurring transactions
- Financial checkpoints
- Multi-currency support
- Workspace member management

## Environment Variables

Required environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## Security

- Row Level Security (RLS) enabled on all tables
- Workspace-based data isolation
- Secure authentication via Supabase Auth
- Environment variables for sensitive data

## License

Private project - All rights reserved
