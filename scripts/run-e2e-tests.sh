#!/bin/bash

# Forma E2E Test Runner
# This script provides easy commands to run different E2E test suites

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if browsers are installed
check_browsers() {
    print_status "Checking if Playwright browsers are installed..."
    
    if ! npx playwright install --dry-run > /dev/null 2>&1; then
        print_warning "Playwright browsers not found. Installing..."
        npx playwright install
        print_success "Browsers installed successfully"
    else
        print_success "Browsers are already installed"
    fi
}

# Function to run authentication tests
run_auth_tests() {
    print_status "Running authentication tests..."
    npx playwright test tests/e2e/auth.spec.ts --project=chromium "$@"
}

# Function to run workspace tests
run_workspace_tests() {
    print_status "Running workspace tests..."
    npx playwright test tests/e2e/workspace.spec.ts --project=chromium "$@"
}

# Function to run user journey tests
run_journey_tests() {
    print_status "Running user journey tests..."
    npx playwright test tests/e2e/user-journey.spec.ts --project=chromium "$@"
}

# Function to run comprehensive flow tests
run_comprehensive_tests() {
    print_status "Running comprehensive flow tests..."
    npx playwright test tests/e2e/comprehensive-flow.spec.ts --project=chromium "$@"
}

# Function to run all E2E tests
run_all_tests() {
    print_status "Running all E2E tests..."
    npx playwright test tests/e2e/ --project=chromium "$@"
}

# Function to run tests in headed mode (visible browser)
run_headed() {
    print_status "Running tests in headed mode (visible browser)..."
    case $1 in
        auth)
            run_auth_tests --headed
            ;;
        workspace)
            run_workspace_tests --headed
            ;;
        journey)
            run_journey_tests --headed
            ;;
        comprehensive)
            run_comprehensive_tests --headed
            ;;
        all)
            run_all_tests --headed
            ;;
        *)
            print_error "Invalid test suite. Use: auth, workspace, journey, comprehensive, or all"
            exit 1
            ;;
    esac
}

# Function to run tests in debug mode
run_debug() {
    print_status "Running tests in debug mode..."
    case $1 in
        auth)
            npx playwright test tests/e2e/auth.spec.ts --project=chromium --debug
            ;;
        workspace)
            npx playwright test tests/e2e/workspace.spec.ts --project=chromium --debug
            ;;
        journey)
            npx playwright test tests/e2e/user-journey.spec.ts --project=chromium --debug
            ;;
        comprehensive)
            npx playwright test tests/e2e/comprehensive-flow.spec.ts --project=chromium --debug
            ;;
        *)
            print_error "Invalid test suite. Use: auth, workspace, journey, or comprehensive"
            exit 1
            ;;
    esac
}

# Function to show test report
show_report() {
    print_status "Opening test report..."
    npx playwright show-report
}

# Function to run specific test by name
run_specific_test() {
    if [ -z "$1" ]; then
        print_error "Please provide a test name pattern"
        exit 1
    fi
    
    print_status "Running specific test: $1"
    npx playwright test --project=chromium --grep "$1" --headed
}

# Function to run cross-browser tests
run_cross_browser() {
    print_status "Running cross-browser tests..."
    case $1 in
        auth)
            npx playwright test tests/e2e/auth.spec.ts
            ;;
        workspace)
            npx playwright test tests/e2e/workspace.spec.ts
            ;;
        journey)
            npx playwright test tests/e2e/user-journey.spec.ts
            ;;
        comprehensive)
            npx playwright test tests/e2e/comprehensive-flow.spec.ts
            ;;
        all)
            npx playwright test tests/e2e/
            ;;
        *)
            print_error "Invalid test suite. Use: auth, workspace, journey, comprehensive, or all"
            exit 1
            ;;
    esac
}

# Function to show help
show_help() {
    echo "Forma E2E Test Runner"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  auth                    Run authentication tests"
    echo "  workspace              Run workspace tests"
    echo "  journey                Run user journey tests"
    echo "  comprehensive          Run comprehensive flow tests"
    echo "  all                    Run all E2E tests"
    echo "  headed [SUITE]         Run tests with visible browser"
    echo "  debug [SUITE]          Run tests in debug mode"
    echo "  cross-browser [SUITE]  Run tests across all browsers"
    echo "  specific [PATTERN]     Run specific test by name pattern"
    echo "  report                 Show test report"
    echo "  setup                  Install browsers and dependencies"
    echo "  help                   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 auth                           # Run auth tests"
    echo "  $0 headed auth                    # Run auth tests with visible browser"
    echo "  $0 debug comprehensive            # Debug comprehensive tests"
    echo "  $0 specific \"login form\"          # Run tests matching 'login form'"
    echo "  $0 cross-browser all              # Run all tests across browsers"
    echo ""
}

# Main script logic
case $1 in
    auth)
        check_browsers
        run_auth_tests "${@:2}"
        ;;
    workspace)
        check_browsers
        run_workspace_tests "${@:2}"
        ;;
    journey)
        check_browsers
        run_journey_tests "${@:2}"
        ;;
    comprehensive)
        check_browsers
        run_comprehensive_tests "${@:2}"
        ;;
    all)
        check_browsers
        run_all_tests "${@:2}"
        ;;
    headed)
        check_browsers
        run_headed "$2"
        ;;
    debug)
        check_browsers
        run_debug "$2"
        ;;
    cross-browser)
        check_browsers
        run_cross_browser "$2"
        ;;
    specific)
        check_browsers
        run_specific_test "$2"
        ;;
    report)
        show_report
        ;;
    setup)
        print_status "Setting up E2E testing environment..."
        npx playwright install
        print_success "Setup complete!"
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        print_error "No command provided"
        show_help
        exit 1
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    print_success "Tests completed successfully!"
else
    print_error "Tests failed!"
    exit 1
fi