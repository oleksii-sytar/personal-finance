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