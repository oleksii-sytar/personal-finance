# Forma - Complete Release Process

## Overview

This document defines the complete release process for Forma, including version management, Git operations, tagging, and deployment to production. When the user says "let's release this" or similar, follow this comprehensive process.

## Release Workflow

### 1. Pre-Release Validation
- ✅ Run full test suite (unit, integration, e2e)
- ✅ Verify build succeeds
- ✅ Check TypeScript compilation
- ✅ Validate linting passes
- ✅ Ensure database migrations are applied
- ✅ Verify cloud connectivity

### 2. Version Management
- 📝 Update version in `package.json`
- 📝 Update version in `package-lock.json`
- 📝 Create/update `CHANGELOG.md` with release notes
- 📝 Update any version references in documentation

### 3. Git Operations
- 🔄 Stage all changes: `git add .`
- 🔄 Commit with release message: `git commit -m "chore: release v{version}"`
- 🔄 Create Git tag: `git tag -a v{version} -m "Release v{version}"`
- 🔄 Push to main branch: `git push origin main`
- 🔄 Push tags: `git push origin --tags`

### 4. GitHub Operations
- 📤 Push all changes to GitHub repository
- 📤 Ensure GitHub Actions/workflows trigger
- 📤 Create GitHub Release with release notes
- 📤 Attach build artifacts if needed

### 5. Deployment
- 🚀 Deploy to production environment
- 🚀 Verify deployment success
- 🚀 Run post-deployment health checks
- 🚀 Monitor for any issues

## Semantic Versioning

Follow [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes, backwards compatible

### Version Examples
- `0.1.0` - First minor release with invitation system
- `0.1.1` - Bug fix for invitation flow
- `0.2.0` - New feature: transaction management
- `1.0.0` - First stable release

## Release Types

### Development Release (0.x.x)
- Features in development
- May have breaking changes
- Used for testing and feedback

### Stable Release (1.x.x)
- Production-ready
- Backwards compatible
- Full feature set

### Hotfix Release (x.x.1+)
- Critical bug fixes
- Security patches
- Minimal changes

## Release Notes Template

```markdown
# Release v{version}

## 🚀 New Features
- Feature 1 description
- Feature 2 description

## 🐛 Bug Fixes
- Bug fix 1 description
- Bug fix 2 description

## 🔧 Improvements
- Improvement 1 description
- Improvement 2 description

## 🔒 Security
- Security fix 1 description

## 📚 Documentation
- Documentation update 1

## 🧪 Testing
- Test improvement 1

## 💥 Breaking Changes
- Breaking change 1 (if any)

## 📦 Dependencies
- Updated dependency 1 to version X
- Added new dependency 2

## 🙏 Contributors
- @username1
- @username2
```

## Automated Release Script

Create `scripts/release.sh` for automated releases:

```bash
#!/bin/bash
set -e

# Get version from argument or prompt
VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 0.1.0"
  exit 1
fi

echo "🚀 Starting release process for v$VERSION..."

# 1. Pre-release validation
echo "📋 Running pre-release validation..."
npm run deploy:check

# 2. Update version
echo "📝 Updating version to $VERSION..."
npm version $VERSION --no-git-tag-version

# 3. Update changelog
echo "📝 Please update CHANGELOG.md with release notes for v$VERSION"
echo "Press Enter when ready to continue..."
read

# 4. Git operations
echo "🔄 Committing changes..."
git add .
git commit -m "chore: release v$VERSION"

echo "🔄 Creating Git tag..."
git tag -a "v$VERSION" -m "Release v$VERSION"

echo "🔄 Pushing to GitHub..."
git push origin main
git push origin --tags

# 5. Deploy
echo "🚀 Deploying to production..."
npm run deploy

echo "✅ Release v$VERSION completed successfully!"
echo "🔗 Create GitHub release at: https://github.com/your-org/forma/releases/new?tag=v$VERSION"
```

## GitHub Release Automation

### GitHub Actions Workflow (`.github/workflows/release.yml`)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Build
        run: npm run build
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

## Post-Release Checklist

### Immediate (within 1 hour)
- [ ] Verify deployment is live
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Check performance metrics

### Short-term (within 24 hours)
- [ ] Monitor user feedback
- [ ] Check analytics for usage patterns
- [ ] Review any bug reports
- [ ] Update documentation if needed

### Medium-term (within 1 week)
- [ ] Gather user feedback
- [ ] Plan next release features
- [ ] Update project roadmap
- [ ] Review release process improvements

## Emergency Rollback

If issues are discovered post-release:

```bash
# 1. Revert to previous version
git revert HEAD

# 2. Create hotfix tag
git tag -a "v{version}-hotfix.1" -m "Hotfix for v{version}"

# 3. Deploy hotfix
npm run deploy

# 4. Push changes
git push origin main --tags
```

## Release Communication

### Internal Team
- Slack/Discord notification
- Email to stakeholders
- Update project status

### External Users
- GitHub release notes
- Documentation updates
- Social media announcement (if applicable)

## Current Release Status

- **Latest Version**: v0.1.0 (Invitation System)
- **Next Planned**: v0.2.0 (Transaction Management)
- **Release Frequency**: Bi-weekly for features, as-needed for hotfixes

## Best Practices

1. **Always test before release** - No exceptions
2. **Write clear release notes** - Users need to understand changes
3. **Tag everything** - Makes rollbacks easier
4. **Monitor post-release** - Catch issues early
5. **Communicate changes** - Keep stakeholders informed
6. **Plan ahead** - Know what's in the next release
7. **Keep releases small** - Easier to debug and rollback
8. **Automate what you can** - Reduce human error