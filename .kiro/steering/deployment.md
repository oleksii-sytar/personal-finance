# Forma - Deployment & Release Strategy

## Overview

This document defines the deployment workflow, environment management, and release strategy for the Forma project.

## Environments

| Environment | Purpose | URL Pattern | Database |
|-------------|---------|-------------|----------|
| **Development** | All development work | `localhost:3000` | Cloud Supabase (single) |
| **Preview** | PR Review | `forma-<branch>.vercel.app` | Same Cloud Supabase |
| **Future Production** | Live (when ready) | `app.forma.app` | New Supabase Project |

**Note**: Currently using single cloud database for all development. Production will use separate Supabase project when ready.

## Deployment Flow

```
Development (Cloud DB)
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
   Automatic Deployment
       ↓
   [Future: Production with separate DB]
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

| Variable | Development | Preview | Future Production |
|----------|-------------|---------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Cloud URL | Same Cloud URL | New Production URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cloud Key | Same Cloud Key | New Production Key |
| `SUPABASE_SERVICE_KEY` | Cloud Key | Same Cloud Key | New Production Key |
| `NEXT_PUBLIC_APP_ENV` | `development` | `preview` | `production` |

## Database Migration Strategy

### Development Workflow
```bash
# 1. Create migration locally
supabase migration new add_user_preferences

# 2. Edit migration file
# supabase/migrations/TIMESTAMP_add_user_preferences.sql

# 3. Apply to cloud database and test
supabase db push

# 4. Commit migration with code changes
git add supabase/migrations/
git commit -m "feat: add user preferences table"
```

### Deployment
```bash
# Migrations are automatically applied when pushing to cloud
supabase db push
```

### Future Production Deployment
```bash
# When ready for production:
# 1. Create new Supabase project
# 2. Apply all migrations to production project
# 3. Migrate essential data only
# 4. Update environment variables
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
