# Forma - Cloud-Only Database Strategy

## Overview

For this personal hobby project, we use **cloud Supabase exclusively** with a single environment approach. This eliminates Docker complexity entirely and provides the simplest possible development experience.

## Database Strategy

### Single Cloud Environment Approach
- **Database**: Cloud Supabase (single environment)
- **Development**: Connects directly to cloud database
- **No Local Docker**: Zero Docker dependencies
- **No Environment Separation**: Single database for development (will be cleaned up before production)
- **Connection Priority**: Cloud connectivity is CRITICAL - all tests verify connection reliability

### Benefits
- ✅ Zero Docker setup required
- ✅ No environment complexity
- ✅ Fastest possible development setup
- ✅ Automatic backups and scaling
- ✅ No migration sync issues
- ✅ Single source of truth
- ✅ Real-time collaboration possible
- ✅ **Robust connection testing ensures reliability**

### Environment Configuration

#### Single Environment (.env.local)
```env
# Cloud Supabase (single environment)
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_KEY=[service-key]

# Development settings
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Future Production (when ready)
```env
# Will be separate Supabase project
NEXT_PUBLIC_SUPABASE_URL=https://[prod-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_KEY=[prod-service-key]

# Production settings
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Setup Instructions

### 1. Get Environment Variables from Vercel
```bash
# Pull environment variables
vercel env pull .env.local
```

### 2. Verify Connection
- Visit `/status` page to check database connectivity
- Test signup/login functionality
- Verify all environment variables are loaded

### 3. Database Management
- Use Supabase Dashboard for schema changes
- Apply migrations via Supabase CLI: `supabase db push`
- Monitor usage and performance in Supabase Dashboard

## Development Workflow

### Daily Development
1. `npm run dev` - Start Next.js (no Docker needed)
2. Code and test against cloud database
3. Deploy to Vercel (same database, seamless)

### Schema Changes
1. Create migration files locally
2. Test locally against cloud database
3. Push to cloud: `supabase db push`
4. Deploy application changes to Vercel

### Data Management
- **Development Data**: All data is development data
- **Test Data**: Use clear prefixes (e.g., "TEST_" in names)
- **Cleanup**: Database will be cleaned up before production launch

## Security Considerations

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Workspace-based isolation prevents data leaks

### Data Management
- Use clear prefixes for test data (e.g., "TEST_" in names)
- Monitor database usage in Supabase Dashboard
- Plan for database cleanup before production

## Troubleshooting

### Connection Issues (CRITICAL)
1. **First Priority**: Check `/status` page for diagnostics
2. **Environment Check**: Verify environment variables: `vercel env pull`
3. **Service Status**: Check Supabase Dashboard for service status
4. **Integration Tests**: Run `npm run test:connection` to verify connectivity
5. **Restart**: Restart Next.js dev server
6. **Network**: Check network connectivity and firewall settings

**Note**: Connection issues are treated as critical failures in deployment

### Performance
- Monitor query performance in Supabase Dashboard
- Use database indexes for frequently queried fields
- Implement proper caching strategies

## Migration from Docker Approach

### Steps Completed
1. ✅ Removed all Docker dependencies completely
2. ✅ Updated environment variables to cloud-only
3. ✅ Created status page for connection monitoring
4. ✅ Updated auth actions with better error handling
5. ✅ Documented cloud-only approach across all steering files
6. ✅ Fixed RLS policy recursion issues
7. ✅ Applied all migrations to cloud database
8. ✅ Implemented comprehensive integration tests for cloud connectivity
9. ✅ Created autonomous deployment system with cloud connectivity priority
10. ✅ Verified all tests pass and deployment works end-to-end

### Files Updated
- `.env.local` - Cloud Supabase credentials only
- `src/app/status/page.tsx` - Connection diagnostics
- All steering documents - Removed Docker references, documented cloud-only approach
- Migration files - Applied to cloud database
- `tests/integration/` - Comprehensive cloud connectivity tests
- `scripts/deploy-autonomous.sh` - Autonomous deployment with integration test priority
- `package.json` - Updated scripts for cloud-only workflow

## Best Practices

### Development
- Always test critical flows before deploying
- Use meaningful commit messages for database changes
- Keep development database clean and organized

### Database
- Regular backups (automatic with Supabase)
- Monitor query performance
- Use proper indexing for performance

### Security
- Never commit real credentials to git
- Use Vercel environment variables for secrets
- Regularly rotate API keys if needed

### Production Preparation
- Plan database cleanup strategy
- Create separate production Supabase project when ready
- Migrate schema and essential data only

This approach prioritizes developer experience and rapid iteration with zero infrastructure complexity.