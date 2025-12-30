# Forma - Third-Party Integrations

## Overview

This document provides comprehensive guidance for working with third-party services and APIs integrated into the Forma project. Each section includes setup instructions, CLI commands, troubleshooting, and best practices.

---

## Supabase

### Overview
Supabase provides the backend infrastructure including PostgreSQL database, authentication, real-time subscriptions, and edge functions.

### CLI Installation

```bash
# Install via npm (recommended)
npm install -g supabase

# Or via Homebrew (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

### Local Development Setup

```bash
# Initialize Supabase in project (first time only)
supabase init

# Start local Supabase stack
supabase start

# This outputs:
# - API URL: http://127.0.0.1:54321
# - GraphQL URL: http://127.0.0.1:54321/graphql/v1
# - Studio URL: http://127.0.0.1:54323
# - Anon Key: eyJ...
# - Service Role Key: eyJ...

# Stop local stack
supabase stop

# Stop and reset database
supabase stop --no-backup
```

### Database Operations

```bash
# Create new migration
supabase migration new create_transactions_table

# List migrations
supabase migration list

# Apply migrations (local)
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > src/types/database.ts

# Diff local vs remote database
supabase db diff

# Push migrations to remote
supabase db push

# Pull remote schema
supabase db pull
```

### Project Linking

```bash
# Login to Supabase
supabase login

# Link to remote project
supabase link --project-ref <project-ref>

# Check link status
supabase status
```

### Edge Functions

```bash
# Create new function
supabase functions new calculate-forecast

# Serve functions locally
supabase functions serve

# Deploy function
supabase functions deploy calculate-forecast

# Deploy all functions
supabase functions deploy

# View function logs
supabase functions logs calculate-forecast
```

### Troubleshooting

**Issue: Docker not running**
```bash
# Error: Cannot connect to Docker daemon
# Solution: Start Docker Desktop or Docker service
sudo systemctl start docker  # Linux
open -a Docker               # macOS
```

**Issue: Port already in use**
```bash
# Error: Port 54321 is already in use
# Solution: Stop other Supabase instances or change port
supabase stop
# Or check what's using the port:
lsof -i :54321
```

**Issue: Migration failed**
```bash
# Check migration status
supabase migration list

# Reset and reapply all migrations
supabase db reset

# Repair migration history (if corrupted)
supabase migration repair --status applied <version>
```

**Issue: Types out of sync**
```bash
# Regenerate types after schema changes
supabase gen types typescript --local > src/types/database.ts
```

### Environment Variables

```env
# Local development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Production (from Supabase Dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Vercel

### Overview
Vercel provides frontend hosting with automatic deployments, preview URLs, and serverless functions.

### CLI Installation

```bash
# Install globally
npm install -g vercel

# Verify installation
vercel --version
```

### Authentication

```bash
# Login to Vercel
vercel login

# Check current user
vercel whoami

# Logout
vercel logout
```

### Project Setup

```bash
# Link project to Vercel (in project directory)
vercel link

# Pull environment variables
vercel env pull .env.local

# Add environment variable
vercel env add VARIABLE_NAME

# Remove environment variable
vercel env rm VARIABLE_NAME
```

### Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy specific directory
vercel ./out

# Deploy with logs visible
vercel --logs

# Build locally (inspect before deploy)
vercel build

# Deploy prebuilt
vercel deploy --prebuilt
```

### Environment Management

```bash
# List environment variables
vercel env ls

# Pull all environments
vercel env pull

# Pull specific environment
vercel env pull .env.production --environment production

# Add secret (encrypted)
vercel secrets add my-secret "secret-value"
```

### Deployment Management

```bash
# List recent deployments
vercel ls

# Inspect deployment
vercel inspect <deployment-url>

# View deployment logs
vercel logs <deployment-url>

# Rollback to previous deployment
vercel rollback <deployment-url>

# Remove deployment
vercel rm <deployment-url>

# Alias deployment to custom domain
vercel alias <deployment-url> <alias>
```

### Domains

```bash
# List domains
vercel domains ls

# Add domain
vercel domains add forma.app

# Remove domain
vercel domains rm forma.app

# Inspect domain
vercel domains inspect forma.app
```

### Troubleshooting

**Issue: Build fails**
```bash
# Check build logs
vercel logs <deployment-url>

# Build locally to debug
vercel build

# Check output
ls -la .vercel/output/
```

**Issue: Environment variables not loading**
```bash
# Verify env vars are set
vercel env ls

# Pull latest env vars
vercel env pull .env.local

# Redeploy to pick up changes
vercel --prod
```

**Issue: Function timeout**
```bash
# Check vercel.json for function configuration
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Best Practices

- Use preview deployments for PR review
- Set up deployment protection for production
- Use environment-specific variables
- Monitor Web Vitals in Vercel Analytics
- Set up error notifications via integrations

---

## National Bank of Ukraine (NBU) API

### Overview
The NBU API provides official exchange rates for currency conversion. It's a public API requiring no authentication.

### API Details

| Attribute | Value |
|-----------|-------|
| Base URL | `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange` |
| Authentication | None required |
| Rate Limit | Not specified (implement caching) |
| Data Format | JSON or XML |

### API Endpoints

```bash
# Get all rates for today
GET /exchange?json

# Get specific currency rate
GET /exchange?valcode=USD&json

# Get rate for specific date (format: YYYYMMDD)
GET /exchange?valcode=USD&date=20241215&json

# Get all rates for specific date
GET /exchange?date=20241215&json
```

### Response Format

```json
[
  {
    "r030": 840,           // Currency code (ISO 4217 numeric)
    "txt": "Долар США",    // Currency name (Ukrainian)
    "rate": 41.2538,       // Exchange rate (1 unit = X UAH)
    "cc": "USD",           // Currency code (ISO 4217 alpha)
    "exchangedate": "15.12.2024"  // Date (DD.MM.YYYY)
  }
]
```

### Implementation

```typescript
// src/lib/nbu-api/client.ts

const NBU_BASE_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange'

interface NBURate {
  r030: number
  txt: string
  rate: number
  cc: string
  exchangedate: string
}

export async function fetchExchangeRate(
  currency: string,
  date?: Date
): Promise<number | null> {
  const params = new URLSearchParams({ 
    valcode: currency, 
    json: '' 
  })
  
  if (date) {
    params.set('date', format(date, 'yyyyMMdd'))
  }
  
  try {
    const response = await fetch(`${NBU_BASE_URL}?${params}`, {
      next: { revalidate: 86400 } // Cache for 24 hours
    })
    
    if (!response.ok) {
      console.error(`NBU API error: ${response.status}`)
      return null
    }
    
    const data: NBURate[] = await response.json()
    return data[0]?.rate ?? null
  } catch (error) {
    console.error('NBU API fetch failed:', error)
    return null
  }
}

export async function fetchAllRates(date?: Date): Promise<NBURate[]> {
  const params = new URLSearchParams({ json: '' })
  
  if (date) {
    params.set('date', format(date, 'yyyyMMdd'))
  }
  
  const response = await fetch(`${NBU_BASE_URL}?${params}`)
  return response.json()
}
```

### Caching Strategy

```typescript
// src/lib/nbu-api/cached-rates.ts

import { createClient } from '@/lib/supabase/server'

export async function getCachedRate(
  currency: string,
  date: Date
): Promise<number | null> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('currency', currency)
    .eq('date', format(date, 'yyyy-MM-dd'))
    .single()
    
  return data?.rate ?? null
}

export async function cacheRate(
  currency: string,
  date: Date,
  rate: number
): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('exchange_rates')
    .upsert({
      currency,
      date: format(date, 'yyyy-MM-dd'),
      rate,
      fetched_at: new Date().toISOString()
    })
}

export async function getExchangeRate(
  currency: string,
  date: Date
): Promise<{ rate: number; source: 'cached' | 'live' }> {
  // Try cache first
  const cachedRate = await getCachedRate(currency, date)
  if (cachedRate) {
    return { rate: cachedRate, source: 'cached' }
  }
  
  // Fetch from NBU
  const liveRate = await fetchExchangeRate(currency, date)
  if (liveRate) {
    await cacheRate(currency, date, liveRate)
    return { rate: liveRate, source: 'live' }
  }
  
  // Fallback: try previous day
  const previousRate = await getExchangeRate(currency, subDays(date, 1))
  return previousRate
}
```

### Edge Function for Daily Sync

```typescript
// supabase/functions/sync-exchange-rates/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN']

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const today = new Date()
  const rates = []
  
  for (const currency of CURRENCIES) {
    const response = await fetch(
      `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${currency}&json`
    )
    const data = await response.json()
    
    if (data[0]) {
      rates.push({
        currency,
        date: today.toISOString().split('T')[0],
        rate: data[0].rate,
        fetched_at: new Date().toISOString()
      })
    }
  }
  
  const { error } = await supabase
    .from('exchange_rates')
    .upsert(rates)
  
  return new Response(
    JSON.stringify({ success: !error, rates: rates.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### Troubleshooting

**Issue: No rate for specific date**
- NBU doesn't publish rates on weekends/holidays
- Solution: Fall back to previous business day

**Issue: API timeout**
- NBU API can be slow sometimes
- Solution: Implement timeout and use cached rates

**Issue: Incorrect date format**
- NBU expects YYYYMMDD format
- Solution: Use `format(date, 'yyyyMMdd')` from date-fns

### Best Practices

- Cache all rates in database
- Sync rates daily via scheduled Edge Function
- Always have fallback to cached rates
- Show warning to user if using stale rates (>7 days old)
- Track rate source (live vs cached) for debugging

---

## Integration Testing

### Testing Supabase

```bash
# Start local Supabase
supabase start

# Run tests against local instance
pnpm test:integration
```

### Testing Vercel

```bash
# Build locally
vercel build

# Preview locally
vercel dev
```

### Mocking NBU API

```typescript
// tests/mocks/nbu-api.ts
import { http, HttpResponse } from 'msw'

export const nbuHandlers = [
  http.get('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange', ({ request }) => {
    const url = new URL(request.url)
    const currency = url.searchParams.get('valcode')
    
    return HttpResponse.json([
      {
        r030: 840,
        txt: 'Долар США',
        rate: 41.25,
        cc: currency || 'USD',
        exchangedate: '15.12.2024'
      }
    ])
  })
]
```
