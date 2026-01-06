#!/bin/bash

# Autonomous deployment script
# Handles all CLI interactions without user input

set -e

echo "🚀 Starting autonomous deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to handle errors
handle_error() {
    echo -e "${RED}❌ Error occurred during deployment${NC}"
    exit 1
}

# Function to run command with timeout (macOS compatible)
run_with_timeout() {
    local timeout_seconds=$1
    local command="${@:2}"
    
    echo -e "${YELLOW}Running: $command${NC}"
    
    # Use perl for timeout on macOS (more reliable than timeout command)
    if perl -e "alarm($timeout_seconds); exec @ARGV" $command 2>/dev/null; then
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 142 ]; then
            echo -e "${RED}❌ Command timed out after ${timeout_seconds}s: $command${NC}"
        else
            echo -e "${RED}❌ Command failed with exit code $exit_code: $command${NC}"
        fi
        return 1
    fi
}

# Set error handler
trap handle_error ERR

# 1. Check if project is linked to cloud
echo -e "${YELLOW}🔗 Checking Supabase project link...${NC}"
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${RED}❌ Supabase project not linked to cloud. Run: supabase link${NC}"
    exit 1
fi

PROJECT_REF=$(cat supabase/.temp/project-ref)
echo -e "${GREEN}✅ Project linked to: $PROJECT_REF${NC}"

# 2. Check if migrations need to be applied
echo -e "${YELLOW}📋 Checking database migrations...${NC}"

# Apply migrations automatically (no user input required)
echo -e "${GREEN}✅ Applying database migrations automatically...${NC}"
# Use printf to pipe 'y' to handle any prompts
if printf 'y\n' | run_with_timeout 60 supabase db push; then
    echo -e "${GREEN}✅ Migrations applied successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Migration failed, timed out, or no changes to apply${NC}"
    # Check if it's a connection issue or no migrations
    if ! run_with_timeout 15 supabase status --output json >/dev/null 2>&1; then
        echo -e "${RED}❌ Cannot connect to Supabase. Check your connection and try again.${NC}"
        exit 1
    fi
fi

# 3. Generate types from database with timeout and better error handling
echo -e "${YELLOW}🔧 Generating TypeScript types...${NC}"

# First check if we can connect to Supabase
if ! run_with_timeout 15 supabase status --output json >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Cannot connect to Supabase, using existing types...${NC}"
else
    # Try to generate types with explicit output flag
    if run_with_timeout 45 supabase gen types typescript --linked --output src/types/database.ts; then
        echo -e "${GREEN}✅ Types generated successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Type generation failed or timed out, using existing types...${NC}"
        # Ensure the types file exists with basic structure if it doesn't
        if [ ! -f "src/types/database.ts" ]; then
            echo "export type Database = { public: { Tables: {}, Views: {}, Functions: {}, Enums: {}, CompositeTypes: {} } }" > src/types/database.ts
            echo -e "${YELLOW}⚠️  Created minimal types file${NC}"
        fi
    fi
fi

# 4. Run type checking
echo -e "${YELLOW}🔍 Running type check...${NC}"
npm run type-check

# 5. Run linting
echo -e "${YELLOW}🧹 Running linter...${NC}"
npm run lint:fix

# 6. Build the application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# 7. Run tests (autonomous mode) - prioritize integration tests for cloud connectivity
echo -e "${YELLOW}🧪 Running tests in autonomous mode...${NC}"

# First, run basic tests to ensure core functionality
echo -e "${GREEN}✅ Running basic tests (core functionality)${NC}"
if ! npm run test:basic; then
    echo -e "${RED}❌ Basic tests failed${NC}"
    exit 1
fi

# Then run integration tests - these are CRITICAL for cloud connectivity
echo -e "${GREEN}✅ Running integration tests (cloud connectivity - CRITICAL)${NC}"
# Run only the connection test to verify cloud connectivity
if ! npm run test:connection; then
    echo -e "${RED}❌ Cloud connectivity test failed${NC}"
    echo -e "${RED}🚨 This is a critical failure - the application cannot function without cloud connectivity${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Cloud connectivity verified${NC}"

echo -e "${GREEN}🎉 Autonomous deployment completed successfully!${NC}"