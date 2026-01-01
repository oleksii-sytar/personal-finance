# Forma E2E Tests

This directory contains comprehensive end-to-end tests for the Forma application using Playwright. These tests open real browsers and test the complete user experience from the interface perspective.

## Test Structure

### Test Files

| File | Purpose | Coverage |
|------|---------|----------|
| `auth.spec.ts` | Authentication flows | Login, registration, password reset, form validation |
| `workspace.spec.ts` | Workspace management | Workspace creation, member management, data isolation |
| `user-journey.spec.ts` | Complete user journeys | New user onboarding, returning user flows, cross-browser testing |
| `comprehensive-flow.spec.ts` | End-to-end scenarios | Full registration to dashboard flow, error handling, performance |

### Helper Files

| File | Purpose |
|------|---------|
| `helpers/test-helpers.ts` | Reusable test utilities and helper functions |
| `config/test-config.ts` | Test configuration, data, and environment settings |

## What These Tests Cover

### ✅ Authentication & Security
- **User Registration**: Form validation, password requirements, email verification flow
- **User Login**: Credential validation, remember me functionality, error handling
- **Password Reset**: Reset request flow, email handling, security measures
- **Session Management**: Session persistence, expiration, logout functionality
- **Form Security**: Input validation, CSRF protection, secure password handling

### ✅ User Interface & Experience
- **Responsive Design**: Testing across desktop, tablet, and mobile viewports
- **Navigation**: Page-to-page navigation, browser back/forward, deep linking
- **Form Interactions**: Real-time validation, error clearing, loading states
- **Accessibility**: Keyboard navigation, ARIA labels, screen reader compatibility
- **Visual Consistency**: Branding, design system compliance, cross-browser rendering

### ✅ Performance & Reliability
- **Page Load Times**: Measuring and validating load performance
- **Network Conditions**: Testing with slow networks, offline scenarios
- **Error Recovery**: JavaScript error handling, form submission interruption
- **Cross-Browser Compatibility**: Chrome, Firefox, Safari, mobile browsers
- **Concurrent Sessions**: Multiple user sessions, session isolation

### ✅ Workspace Management
- **Access Control**: Protected routes, authentication requirements
- **Data Isolation**: User data separation, workspace boundaries
- **Member Management**: Invitations, permissions, ownership transfer
- **Dashboard Access**: Post-authentication flows, workspace selection

### ✅ Edge Cases & Error Handling
- **Network Failures**: Offline mode, API timeouts, connection issues
- **Invalid Data**: Malformed inputs, boundary conditions, injection attempts
- **Browser Quirks**: Different browser behaviors, viewport changes
- **User Errors**: Incorrect credentials, duplicate registrations, form mistakes

## Running the Tests

### Quick Start

```bash
# Install browsers (first time only)
npx playwright install

# Run all tests
npm run test:e2e

# Run specific test suite
npx playwright test tests/e2e/auth.spec.ts

# Run with visible browser (headed mode)
npx playwright test tests/e2e/auth.spec.ts --headed

# Run specific test
npx playwright test --grep "should display login form correctly"
```

### Using the Test Runner Script

```bash
# Make script executable (first time only)
chmod +x scripts/run-e2e-tests.sh

# Run authentication tests with visible browser
./scripts/run-e2e-tests.sh headed auth

# Debug specific test suite
./scripts/run-e2e-tests.sh debug comprehensive

# Run cross-browser tests
./scripts/run-e2e-tests.sh cross-browser all

# Run specific test by name
./scripts/run-e2e-tests.sh specific "login form"

# Show test report
./scripts/run-e2e-tests.sh report
```

### Test Commands Reference

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:e2e:headed` | Run tests with visible browser |
| `npm run test:e2e:debug` | Run tests in debug mode |
| `npx playwright show-report` | View test results report |
| `npx playwright codegen` | Generate test code interactively |

## Test Configuration

### Environment Variables

```env
# Test environment (local, staging, production)
BASE_URL=http://127.0.0.1:3001

# Test user credentials
TEST_EMAIL=test@example.com
TEST_PASSWORD=password123

# Feature flags for testing
NEXT_PUBLIC_FEATURE_TESTING=true
```

### Playwright Configuration

The tests are configured in `playwright.config.ts`:

- **Base URL**: `http://127.0.0.1:3001`
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Timeouts**: 30 seconds for tests, 5 seconds for assertions
- **Retries**: 2 retries on CI, 0 locally
- **Web Server**: Automatically starts Next.js dev server

### Viewport Testing

Tests automatically run across multiple viewport sizes:

- **Desktop**: 1920x1080, 1366x768, 1200x800
- **Tablet**: 768x1024 (portrait), 1024x768 (landscape)
- **Mobile**: 375x667 (iPhone), 414x896 (iPhone Plus)

## Test Data Management

### Dynamic Test Data

Tests use dynamically generated data to avoid conflicts:

```typescript
// Generate unique email for each test run
const testEmail = `test-${Date.now()}@example.com`

// Generate unique workspace name
const workspaceName = `Test Workspace ${Date.now()}`
```

### Test User Accounts

For tests requiring existing users:

```typescript
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  fullName: 'Test User'
}
```

### Mock Data

Tests use realistic mock data for:
- User profiles
- Transaction data
- Category information
- Workspace settings

## Debugging Tests

### Visual Debugging

```bash
# Run with visible browser
npx playwright test --headed

# Run in debug mode (step through)
npx playwright test --debug

# Generate test code interactively
npx playwright codegen http://127.0.0.1:3001
```

### Screenshots and Videos

Tests automatically capture:
- Screenshots on failure
- Videos of test execution (on CI)
- Trace files for debugging

### Console Logs

Tests monitor and report:
- JavaScript errors
- Network failures
- Performance metrics
- Accessibility violations

## Best Practices

### Test Organization

1. **Group related tests** in describe blocks
2. **Use descriptive test names** that explain the scenario
3. **Keep tests independent** - each test should work in isolation
4. **Clean up after tests** - reset state between tests

### Selectors

1. **Prefer semantic selectors** over CSS classes
2. **Use data-testid** for elements that need stable selectors
3. **Avoid brittle selectors** that depend on implementation details
4. **Use role-based selectors** for accessibility

### Assertions

1. **Wait for elements** before interacting
2. **Use specific assertions** (toBeVisible vs toBeTruthy)
3. **Test user-visible behavior** not implementation details
4. **Include meaningful error messages**

### Performance

1. **Minimize test setup time** with efficient helpers
2. **Reuse browser contexts** when possible
3. **Parallel test execution** for faster feedback
4. **Skip unnecessary waits** with smart selectors

## Continuous Integration

### GitHub Actions Integration

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Reporting

Tests generate comprehensive reports including:
- Test results summary
- Screenshots and videos
- Performance metrics
- Accessibility audit results
- Cross-browser compatibility matrix

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout or check server startup |
| Browsers not found | Run `npx playwright install` |
| Port conflicts | Change port in `playwright.config.ts` |
| Flaky tests | Add proper waits and stable selectors |
| Network errors | Check firewall and proxy settings |

### Debug Commands

```bash
# Check Playwright installation
npx playwright --version

# List available browsers
npx playwright install --dry-run

# Test browser launch
npx playwright open

# Check test configuration
npx playwright test --list
```

## Contributing

When adding new E2E tests:

1. **Follow the existing patterns** in test organization
2. **Use the helper functions** for common operations
3. **Add appropriate assertions** for all user-visible behavior
4. **Test both success and error scenarios**
5. **Consider cross-browser compatibility**
6. **Update this documentation** for new test categories

## Test Results

After running tests, view results with:

```bash
npx playwright show-report
```

This opens an interactive HTML report showing:
- Test execution timeline
- Screenshots and videos
- Network activity
- Console logs
- Performance metrics

The E2E tests provide confidence that the Forma application works correctly from a real user's perspective across different browsers, devices, and network conditions.