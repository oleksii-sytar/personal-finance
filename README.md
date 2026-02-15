# Forma - Personal Finance Management

A modern, privacy-first personal finance management application built for families with children.

## 🚀 Features

- **Multi-Workspace Support** - Manage multiple family workspaces
- **Transaction Management** - Track income and expenses with ease
- **Account Reconciliation** - Real-time balance tracking and reconciliation
- **Category Organization** - Flexible category system for expenses
- **Planned Transactions** - Schedule future income and expenses
- **Current Month Overview** - See your complete financial picture
- **Multi-Currency Support** - Handle transactions in different currencies
- **Team Collaboration** - Invite family members to workspaces

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **State Management**: React Query (TanStack Query)
- **Deployment**: Vercel
- **Testing**: Vitest, Playwright, React Testing Library

## 📦 Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/forma.git
cd forma

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Visit http://localhost:3000

## 🔧 Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run type-check   # Run TypeScript compiler
npm run format       # Format code with Prettier
```

### Testing
```bash
npm run test                # Run all tests
npm run test:unit           # Run unit tests
npm run test:integration    # Run integration tests
npm run test:e2e            # Run end-to-end tests
npm run test:coverage       # Run tests with coverage
```

### Database
```bash
npm run db:types     # Generate TypeScript types from database
npm run db:push      # Apply migrations to database
```

### Deployment
```bash
npm run deploy       # Full autonomous deployment
npm run deploy:check # Quick deployment check (no tests)
```

## 📁 Project Structure

```
forma/
├── .kiro/                  # Kiro AI steering files and specs
│   ├── steering/           # Development guidelines
│   └── specs/              # Feature specifications
├── docs/                   # Technical documentation
├── scripts/                # Utility scripts
├── src/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── actions/            # Server Actions
│   ├── lib/                # Utility libraries
│   └── types/              # TypeScript types
├── supabase/
│   └── migrations/         # Database migrations
└── tests/                  # Test files
```

## 📚 Documentation

- **[Developer Quickstart](./docs/DEVELOPER_QUICKSTART.md)** - Detailed setup guide
- **[Documentation Index](./docs/README.md)** - Complete documentation index
- **[CHANGELOG](./CHANGELOG.md)** - Version history and changes
- **[Latest Release](./RELEASE_v1.3.0_SUMMARY.md)** - Current version details

### Steering Documents
Located in `.kiro/steering/`:
- `product.md` - Product vision and requirements
- `tech.md` - Technology stack details
- `structure.md` - Project organization
- `testing.md` - Testing standards
- `code-quality.md` - Code quality guidelines
- `autonomous-deployment.md` - Deployment process

## 🎨 Design Philosophy

Forma uses the "Executive Lounge" aesthetic - a premium, sophisticated design with:
- Dark mode default with warm ambient lighting
- Glass morphism effects
- Smooth animations and transitions
- Generous spacing and typography
- Color palette: Peat Charcoal, Single Malt Gold, Growth Emerald

## 🔐 Security

- Row Level Security (RLS) on all database tables
- Workspace-based data isolation
- Secure authentication via Supabase Auth
- Environment-based configuration
- No sensitive data in repository

## 🧪 Testing

We maintain high test coverage:
- **Utilities**: 90%+
- **Server Actions**: 80%+
- **Hooks**: 70%+
- **Components**: 60%+
- **Overall**: 75%+

Run tests before committing:
```bash
npm run test
```

## 🚀 Deployment

Forma uses an autonomous deployment system:

```bash
# Deploy to production
npm run deploy
```

This automatically:
1. Applies database migrations
2. Generates TypeScript types
3. Runs type checking
4. Runs linting
5. Builds the application
6. Runs tests
7. Deploys to Vercel

See [Autonomous Deployment](./kiro/steering/autonomous-deployment.md) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Follow our [Code Quality Guidelines](./.kiro/steering/code-quality.md).

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database by [Supabase](https://supabase.com/)
- Deployed on [Vercel](https://vercel.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**Version**: 1.3.0  
**Last Updated**: February 15, 2026  
**Status**: Production Ready ✅
