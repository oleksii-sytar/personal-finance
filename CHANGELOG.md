# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-02-04

### Security
- Removed exposed database credentials from git history
- Removed exposed Supabase service key from git history
- Updated security practices for credential management

### Fixed
- Fixed user deletion cascade constraints in database
- Fixed workspace member deletion flow
- Cleaned up test data from production database

### Changed
- Improved autonomous deployment system
- Updated database migration scripts

## [1.0.0] - 2026-01-01

### Added
- Initial production release
- Multi-workspace support
- Transaction management
- Category organization
- Recurring transactions
- Financial checkpoints
- Multi-currency support
- Workspace member management
- Invitation system
- User authentication and authorization

### Infrastructure
- Supabase database with RLS
- Next.js 15 App Router
- TypeScript strict mode
- Tailwind CSS styling
- Vercel deployment
