# Deployment Workflow

## Standard Deployment Process

Follow this process for all code changes before pushing to main branch:

### 1. Pre-Deployment Validation
Always run build command to ensure no compilation errors:
```bash
npm run build
```

**Requirements:**
- Build must complete successfully (✓ Compiled successfully)
- No TypeScript errors
- No linting errors
- All pages must generate correctly

### 2. Git Workflow
After successful build validation:

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: integrate Vercel Speed Insights for performance monitoring"

# Push to main branch
git push origin main
```

### 3. Post-Deployment Steps
For Vercel integrations specifically:

1. **Automatic Deployment**: Vercel will auto-deploy from main branch
2. **Dashboard Configuration**: 
   - Go to Vercel Dashboard → Project → Speed Insights tab
   - Enable Speed Insights (should auto-detect integration)
3. **Verification**: Check deployment logs for any issues

### 4. Integration-Specific Notes

#### Vercel Speed Insights
- Package: `@vercel/speed-insights`
- Import: `import { SpeedInsights } from '@vercel/speed-insights/next'`
- Placement: End of `<body>` tag in root layout
- Manual step: Enable in Vercel Dashboard after deployment

#### Analytics & Monitoring Tools
- Always test build before pushing
- Place components at end of body for optimal loading
- Verify dashboard configuration post-deployment

### 5. Rollback Strategy
If deployment fails:
```bash
# Revert last commit
git revert HEAD

# Push revert
git push origin main
```

## Checklist
- [ ] `npm run build` passes successfully
- [ ] All TypeScript errors resolved
- [ ] Changes committed with descriptive message
- [ ] Pushed to main branch
- [ ] Vercel deployment completed
- [ ] Dashboard configuration completed (if applicable)
- [ ] Integration verified in production

This workflow ensures reliable deployments and maintains code quality standards.