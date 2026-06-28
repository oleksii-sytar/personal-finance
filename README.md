# Forma — Authenticated App Shell

A clean, authenticated starting point built with Next.js 15 and Supabase. The
finance/workspace product that previously lived here has been intentionally
removed; what remains is a reusable shell with authentication, theming, and the
public landing page in place, ready for the next product direction.

> **Status:** auth-only shell (baseline for a new build). See the
> [CHANGELOG](./CHANGELOG.md) for what was removed.

## What's included

- **Authentication** — Supabase Auth: sign up, log in, log out, password reset,
  and (optional) email verification, wired through a client `AuthProvider`
  context with server-side session refresh in `middleware.ts`.
- **Route protection** — server middleware guards `/dashboard`; a client
  `SmartRouteGuard` re-checks auth in the dashboard layout.
- **Public landing page** at `/` and a Supabase connectivity page at `/status`.
- **Authenticated shell** — a `(dashboard)` layout (sidebar + mobile nav +
  user profile) with a placeholder dashboard page to build on.
- **Design system** — the "Executive Lounge" Tailwind theme (dark/light) with
  glass-morphism UI primitives (`Button`, `Card`, `Input`, toast).

## Tech stack

- **Framework**: Next.js 15 (App Router), React 18
- **Language**: TypeScript (strict)
- **Auth & DB**: Supabase (`@supabase/ssr`)
- **Styling**: Tailwind CSS
- **State**: React Query (TanStack Query)
- **Testing**: Vitest + Testing Library

## Getting started

```bash
npm install

# Configure environment (see "Environment" below)
cp .env.example .env.local   # then edit with your own Supabase project

npm run dev                  # http://localhost:3000
```

### Environment

Set these in `.env.local` (use **your own private** Supabase project — this is a
personal project and must not be pointed at any shared/work infrastructure):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=        # server-only; optional for the shell
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Email confirmations are disabled in `supabase/config.toml`
(`enable_confirmations = false`), so sign-up logs the user in immediately.

## Scripts

```bash
npm run dev          # start dev server
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (build config; excludes tests)
npm run test         # Vitest unit tests
npm run format       # Prettier
```

## Project structure

```
src/
├── app/
│   ├── (dashboard)/      # authenticated shell (layout + placeholder dashboard)
│   ├── auth/             # login, signup, verify-email, reset-password
│   ├── status/           # Supabase connectivity check
│   ├── layout.tsx        # root providers (theme, query, auth, error boundary)
│   └── page.tsx          # public landing page
├── components/
│   ├── forms/            # auth forms (+ lazy wrappers)
│   ├── layout/           # sidebar / mobile nav / user profile
│   ├── shared/           # guards, error boundaries, session/offline managers
│   └── ui/               # Button, Card, Input, toast
├── contexts/             # auth, theme, react-query providers
├── lib/
│   ├── supabase/         # browser + server clients
│   ├── session/          # session manager
│   ├── utils/            # currency, format, return-url, error logging
│   └── validations/      # auth Zod schemas
└── middleware.ts         # session refresh + /dashboard guard

supabase/
└── migrations/           # includes the reset-to-auth-only-shell migration
```

## Database

The latest migration, `supabase/migrations/20260616114443_reset_to_auth_only_shell.sql`,
drops the former finance/workspace schema and leaves only Supabase Auth. Apply
migrations only against your own private Supabase project.

## License

Private and proprietary.
