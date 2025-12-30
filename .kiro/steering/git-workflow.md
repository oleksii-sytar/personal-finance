# Forma - Git Workflow & Version Control

## Overview

This document defines the Git workflow, branching strategy, and commit conventions for the Forma project.

## Branch Strategy

### Main Branches

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production-ready code | Protected, requires PR |
| `staging` | Pre-production testing | Protected, requires PR |

### Feature Branches

```
feature/  - New features
fix/      - Bug fixes  
chore/    - Maintenance tasks
docs/     - Documentation updates
refactor/ - Code refactoring
test/     - Test additions/fixes
```

### Branch Naming Convention

```
<type>/<ticket-id>-<short-description>

Examples:
feature/VZ-123-transaction-entry
fix/VZ-456-currency-conversion
chore/VZ-789-update-dependencies
docs/VZ-101-api-documentation
```

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, missing semicolons, etc. |
| `refactor` | Code change that neither fixes bug nor adds feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies, etc. |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |
| `revert` | Reverting a previous commit |

### Scopes (optional)

```
auth      - Authentication related
dashboard - Dashboard components/logic
tx        - Transactions
categories - Categories
accounts  - Accounts
ui        - UI components
db        - Database/migrations
api       - API routes/actions
config    - Configuration
deps      - Dependencies
```

### Examples

```bash
# Feature
feat(tx): add transaction quick entry form
feat(dashboard): implement balance forecast widget

# Fix
fix(auth): resolve session persistence on refresh
fix(tx): correct currency conversion for historical rates

# Chore
chore(deps): update Next.js to 14.2.0
chore(ci): add e2e tests to PR workflow

# Docs
docs(api): add JSDoc comments to server actions

# Refactor
refactor(tx): extract validation logic to separate module
```

### Commit Message Guidelines

1. **Subject line**:
   - Imperative mood ("add" not "added" or "adds")
   - No period at the end
   - Max 72 characters
   - Lowercase after type/scope

2. **Body** (optional):
   - Explain what and why, not how
   - Wrap at 72 characters
   - Separate from subject with blank line

3. **Footer** (optional):
   - Reference issues: `Closes #123`, `Fixes #456`
   - Breaking changes: `BREAKING CHANGE: description`

### Full Example

```
feat(tx): add recurring transaction support

Implement the ability to mark transactions as recurring and 
automatically create instances based on defined frequency.

- Add `is_recurring` and `recurrence_pattern` columns
- Create RecurringTransactionForm component
- Add server action for processing recurring transactions

Closes #VZ-234
```

## Workflow

### Starting New Work

```bash
# 1. Update main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/VZ-123-new-feature

# 3. Make changes and commit frequently
git add .
git commit -m "feat(scope): description"

# 4. Push to remote
git push -u origin feature/VZ-123-new-feature
```

### Keeping Branch Updated

```bash
# Rebase on main regularly to avoid conflicts
git fetch origin
git rebase origin/main

# If conflicts occur, resolve them then:
git add .
git rebase --continue
```

### Creating Pull Request

1. Push your branch to remote
2. Create PR via GitHub/GitLab
3. Fill out PR template
4. Request review
5. Address feedback with new commits
6. Squash and merge when approved

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 💥 Breaking change (fix or feature causing existing functionality to break)
- [ ] 📚 Documentation update
- [ ] 🔧 Chore (build, dependencies, etc.)

## Related Issues
Closes #VZ-123

## Changes Made
- List of specific changes
- 

## Screenshots (if applicable)
Before | After
------ | -----
image  | image

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated if needed
- [ ] No new warnings or errors
```

## Git Commands Reference

### Daily Commands

```bash
# Check status
git status

# Stage changes
git add .                    # All changes
git add src/components/      # Specific directory
git add *.tsx                # By pattern

# Commit
git commit -m "type(scope): message"

# Push
git push origin feature/branch-name

# Pull latest changes
git pull origin main

# Rebase on main
git fetch origin
git rebase origin/main
```

### Fixing Mistakes

```bash
# Amend last commit (before push)
git commit --amend -m "new message"

# Undo last commit, keep changes
git reset --soft HEAD~1

# Undo last commit, discard changes
git reset --hard HEAD~1

# Discard unstaged changes
git checkout -- .

# Revert a pushed commit
git revert <commit-hash>
```

### Stashing

```bash
# Stash current changes
git stash

# Stash with message
git stash save "work in progress on feature X"

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{2}
```

### Branching

```bash
# List all branches
git branch -a

# Create and switch to new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main

# Delete local branch
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature
```

### Rebasing and Squashing

```bash
# Interactive rebase to squash commits
git rebase -i HEAD~3

# In editor, change 'pick' to 'squash' for commits to combine
# pick abc1234 First commit message
# squash def5678 Second commit message
# squash ghi9012 Third commit message

# Rebase on main
git rebase main
```

## Best Practices

### Do

- ✅ Commit frequently with small, focused changes
- ✅ Write descriptive commit messages
- ✅ Keep PRs small and focused (<400 lines when possible)
- ✅ Rebase and squash before merging
- ✅ Delete branches after merge
- ✅ Pull and rebase on main regularly

### Don't

- ❌ Commit sensitive data (secrets, keys)
- ❌ Force push to shared branches (main, staging)
- ❌ Commit broken code to main
- ❌ Leave unfinished work in commits
- ❌ Use vague commit messages ("fix bug", "update code")
- ❌ Commit large files (use Git LFS if needed)

## Git Hooks (Husky)

### Pre-commit
```bash
# Runs before each commit
pnpm lint-staged    # Lint and format staged files
pnpm type-check     # TypeScript type checking
```

### Commit-msg
```bash
# Validates commit message format
npx commitlint --edit $1
```

### Configuration

```javascript
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
pnpm type-check
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      'auth', 'dashboard', 'tx', 'categories', 
      'accounts', 'ui', 'db', 'api', 'config', 'deps'
    ]],
  },
}
```

## Handling Conflicts

### Prevention
- Pull and rebase on main frequently
- Communicate with team about overlapping work
- Keep PRs small and merge quickly

### Resolution

```bash
# When conflict occurs during rebase
# 1. Identify conflicted files
git status

# 2. Open files and resolve conflicts
# Look for conflict markers: <<<<<<<, =======, >>>>>>>

# 3. Stage resolved files
git add <resolved-file>

# 4. Continue rebase
git rebase --continue

# Or abort if needed
git rebase --abort
```

## Release Tagging

```bash
# Create annotated tag for release
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag to remote
git push origin v1.0.0

# Push all tags
git push --tags

# List tags
git tag -l
```

### Version Format
Follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- Example: `v1.2.3`
