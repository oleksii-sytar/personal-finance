# Forma - Autonomous Deployment System

## Overview

The autonomous deployment system handles all CLI interactions automatically without requiring user input. This includes database migrations, test execution, and deployment processes.

## Key Features

- ✅ **Automatic Migration Application**: Uses `--yes` flag to apply database migrations without prompts
- ✅ **Autonomous Test Execution**: Tests run to completion without interactive prompts
- ✅ **Error Handling**: Graceful error handling with clear feedback
- ✅ **Zero User Interaction**: No manual button presses or confirmations required

## Autonomous Scripts

### Database Operations

```bash
# Apply migrations automatically
npm run db:push

# Generate types automatically
npm run db:types
```

### Testing

```bash
# Run unit/integration tests autonomously
npm run test:autonomous

# Run integration tests only (cloud connectivity)
npm run test:integration

# Run connection tests specifically
npm run test:connection

# Run E2E tests autonomously (Chromium only for speed)
npm run test:e2e:autonomous

# Run all tests with coverage
npm run test:coverage
```

### Deployment

```bash
# Full autonomous deployment
npm run deploy

# Quick deployment check (no tests)
npm run deploy:check
```

## Autonomous Deployment Process

When you run `npm run deploy`, the system automatically:

1. **📋 Checks Database Migrations**
   - Runs `supabase db push --yes` (no user confirmation needed)
   - Automatically applies any pending migrations
   - Gracefully handles "no migrations to apply" scenarios

2. **🔧 Generates Types**
   - Updates TypeScript types from database schema
   - Falls back gracefully if Supabase connection fails
   - No user interaction required

3. **🔍 Runs Type Check**
   - Validates TypeScript compilation
   - Fails fast if type errors exist

4. **🧹 Runs Linter**
   - Automatically fixes linting issues where possible
   - Reports unfixable issues as warnings

5. **🏗️ Builds Application**
   - Compiles Next.js application
   - Validates build success

6. **🧪 Runs Tests**
   - Executes basic tests for core functionality validation
   - **CRITICAL**: Runs integration tests to verify cloud connectivity
   - Fails deployment if cloud connection issues are detected
   - No interactive prompts or waiting for user input
   - Prioritizes connection reliability over deployment speed

## Configuration Details

### Supabase CLI Autonomous Mode

```bash
# Uses --yes flag to auto-confirm all prompts
supabase db push --yes
```

### CRITICAL: Database Operations Must Use npm Scripts

**⚠️ MANDATORY RULE: ALL database operations MUST be executed through npm scripts ONLY**

```bash
# ✅ CORRECT - Use npm scripts
npm run db:push          # Apply migrations
npm run db:types         # Generate TypeScript types

# ❌ WRONG - Never use direct Supabase CLI commands
supabase db push --yes   # DON'T USE
supabase gen types       # DON'T USE
```

**Why this is critical:**
- npm scripts have proper error handling and fallbacks
- Direct CLI commands can corrupt files (e.g., database.ts)
- npm scripts ensure consistent behavior across environments
- Prevents interactive prompts that block automation

**If you need to debug database operations:**
1. Check npm script definition in package.json
2. Run with verbose output: `npm run db:push -- --debug`
3. Check Supabase Dashboard for migration status
4. Never bypass npm scripts even for debugging

### Vitest Autonomous Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    watch: false,           // No watch mode
    reporter: ['verbose'],  // Clear output, no interactive UI
    bail: 1,               // Stop on first failure
  },
})
```

### Playwright Autonomous Configuration

```typescript
// playwright.config.ts - when AUTONOMOUS_MODE=true
{
  reporter: 'list',        // Simple list output, no HTML report
  projects: ['chromium'],  // Only run Chromium for speed
}
```

## Error Handling

The autonomous system includes comprehensive error handling with **priority on cloud connectivity**:

- **Migration Errors**: Gracefully handles "no migrations to apply" scenarios
- **Connection Failures**: **CRITICAL** - Deployment fails if cloud connectivity issues detected
- **Test Failures**: Stops deployment on test failures with clear error messages
- **Build Errors**: Provides detailed build failure information
- **Network Issues**: Robust handling but fails deployment if persistent connectivity issues

## Usage Examples

### Daily Development Deployment

```bash
# Make your changes, then deploy autonomously
npm run deploy
```

### Quick Check Before Commit

```bash
# Run checks without full test suite
npm run deploy:check
```

### Database-Only Updates

```bash
# Apply migrations and update types
npm run db:push && npm run db:types
```

## Integration with CI/CD

The autonomous system is designed to work seamlessly with CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Deploy Autonomously
  run: npm run deploy
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

## Troubleshooting

### Common Issues

**Issue: Migration prompt still appears**
- Solution: Ensure using `supabase db push --yes`
- Check Supabase CLI version supports `--yes` flag

**Issue: Tests hang waiting for input**
- Solution: Use `npm run test:autonomous` instead of `npm run test`
- Ensure `watch: false` in vitest config

**Issue: E2E tests open browser**
- Solution: Use `npm run test:e2e:autonomous` for headless mode
- Set `AUTONOMOUS_MODE=true` environment variable

### Debug Mode

For debugging autonomous deployments:

```bash
# Enable debug output
DEBUG=1 npm run deploy
```

## Current Status

✅ **Fully Operational**: The autonomous deployment system is working correctly and handles all CLI interactions without user input.

### Recent Improvements
- **CRITICAL**: Implemented comprehensive integration tests for cloud connectivity
- **Docker Removal**: Completely removed all Docker dependencies and references
- Fixed TypeScript errors in workspace components
- Created robust type generation with fallback handling
- Added timeout handling for all CLI operations
- Graceful error handling for network issues
- Autonomous migration application with `--yes` flag
- **Priority on Connection Reliability**: Integration tests verify cloud database connectivity before deployment
- **Cloud-Only Architecture**: Single cloud Supabase environment for all development

### Deployment Success Metrics
- ✅ Database migrations: Auto-applied without prompts
- ✅ Type generation: Graceful fallback when connection fails
- ✅ TypeScript compilation: All errors resolved
- ✅ Linting: Auto-fixes applied, warnings reported
- ✅ Build process: Successful Next.js compilation
- ✅ **Cloud Connectivity**: Integration tests verify Supabase connection reliability
- ✅ Basic tests: Core functionality validated
- ✅ **Zero Docker Dependencies**: Complete removal of Docker infrastructure

## Best Practices

1. **Always Use Autonomous Scripts**: Use `npm run deploy` instead of manual commands
2. **Test Locally First**: Run `npm run deploy:check` before pushing
3. **Monitor Output**: Watch for any unexpected prompts or hangs
4. **Keep Scripts Updated**: Update autonomous flags when CLI tools change

This system ensures completely hands-off deployment and testing, eliminating the need for manual CLI interactions.