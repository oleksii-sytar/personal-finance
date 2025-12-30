# Forma - Deployment & Release Strategy

## Overview

This document defines the deployment workflow, environment management, and release strategy for the Forma project.

## Environments

| Environment | Purpose | URL Pattern | Database |
|-------------|---------|-------------|----------|
| **Local** | Development | `localhost:3000` | Supabase Local (Docker) |
| **Preview** | PR Review | `forma-<branch>.vercel.app` | Supabase Staging |
| **Staging** | Pre-production | `staging.forma.app` | Supabase Staging |
| **Production** | Live | `app.forma.app` | Supabase Production |

## Deployment Flow

```
Local Development
       ↓
   Push to Branch
       ↓
   Create Pull Request
       ↓
   Automatic Preview Deployment (Vercel)
       ↓
   Code Review + Tests Pass
       ↓
   Merge to Main
       ↓
   Automatic Staging Deployment
       ↓
   QA Verification (Manual)
       ↓
   Manual Production Promotion
```

## Vercel Deployment Configuration

### vercel.json
```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["fra1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### Environment Variables

| Variable | Local | Preview | Staging | Production |
|----------|-------|---------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Local URL | Staging URL | Staging URL | Production URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local Key | Staging Key | Staging Key | Production Key |
| `SUPABASE_SERVICE_KEY` | Local Key | Staging Key | Staging Key | Production Key |
| `NEXT_PUBLIC_APP_ENV` | `development` | `preview` | `staging` | `production` |

## Database Migration Strategy

### Development Workflow
```bash
# 1. Create migration locally
supabase migration new add_user_preferences

# 2. Edit migration file
# supabase/migrations/TIMESTAMP_add_user_preferences.sql

# 3. Apply locally and test
supabase db reset

# 4. Commit migration with code changes
git add supabase/migrations/
git commit -m "feat: add user preferences table"
```

### Staging Deployment
```bash
# Migrations are automatically applied when pushing to staging branch
# OR manually:
supabase db push --linked
```

### Production Deployment
```bash
# 1. Create backup first
supabase db dump -f backup_$(date +%Y%m%d).sql

# 2. Apply migrations (dry run first)
supabase db push --dry-run

# 3. Apply for real
supabase db push
```

## Release Phases

### Phase 1: Foundation (MVP)
- User authentication (login/register/password reset)
- Workspace creation
- Basic transaction CRUD
- Category management
- Dashboard with balance display
- Basic responsive design

### Phase 2: Core Features
- Recurring transactions
- Multi-currency support with NBU API
- Transaction filtering and search
- Monthly reconciliation workflow
- Checkpoint creation

### Phase 3: Intelligence
- Pattern learning for forecasting
- Daily balance predictions
- Spending insights and reports
- Goal setting and tracking

### Phase 4: Polish
- Full responsive design for all breakpoints
- Keyboard shortcuts (hotkey-first)
- Performance optimizations
- PWA support
- Offline capabilities

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Lighthouse score >90
- [ ] Database migrations tested locally
- [ ] Environment variables configured
- [ ] Feature flags set correctly

### Post-Deployment
- [ ] Verify deployment URL accessible
- [ ] Check critical paths (login, dashboard, transactions)
- [ ] Monitor error tracking (Sentry)
- [ ] Check database migration status
- [ ] Verify environment variables loaded

## Rollback Procedures

### Vercel Rollback
```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

### Database Rollback
```bash
# Restore from backup
supabase db restore backup_YYYYMMDD.sql

# Or revert specific migration
# (Requires manual SQL to undo changes)
```

## Monitoring & Alerts

### Error Tracking
- **Sentry** for frontend and Edge Functions
- Alert on error rate >1% of requests
- Daily error digest emails

### Performance Monitoring
- **Vercel Analytics** for Web Vitals
- Alert on LCP >2.5s
- Weekly performance reports

### Uptime Monitoring
- **Better Uptime** or similar
- Check every 1 minute
- Alert on downtime via Slack/Email

## Deployment Commands Reference

### Vercel CLI
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs <deployment-url>

# Rollback
vercel rollback <deployment-url>

# Pull environment variables
vercel env pull .env.local
```

### Supabase CLI
```bash
# Check migration status
supabase migration list

# Apply migrations to linked project
supabase db push

# Create a database dump
supabase db dump -f backup.sql

# Check project status
supabase status
```

## Feature Flags for Safe Deployment

When deploying new features:
1. Deploy with feature flag OFF
2. Enable for internal users first
3. Gradual rollout (10% → 50% → 100%)
4. Monitor for issues at each stage
5. Quick disable if problems occur

See `feature-flags.md` for implementation details.
