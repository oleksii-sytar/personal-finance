# Personal Finance Manager

A modern personal finance management application built with Next.js, Supabase, and TypeScript. Track expenses, manage budgets, and gain insights into your financial habits with an intuitive and secure interface.

## Features

- 💰 **Expense Tracking**: Record and categorize your income and expenses
- 📊 **Budget Management**: Create and monitor budgets for different categories
- 📈 **Financial Analytics**: Visualize your spending patterns and trends
- 🏦 **Multi-Account Support**: Manage multiple bank accounts and credit cards
- 🔒 **Secure Authentication**: User authentication powered by Supabase Auth
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time)
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/oleksii-sytar/personal-finance.git
cd personal-finance
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Protected dashboard routes
│   ├── auth/              # Authentication pages
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   └── ui/               # Base UI components
├── lib/                  # Utility libraries
│   ├── supabase/         # Supabase configuration
│   ├── utils.ts          # Helper functions
│   └── constants.ts      # App constants
├── types/                # TypeScript type definitions
└── hooks/                # Custom React hooks
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Database Setup

This application uses Supabase as the backend. You'll need to set up the following tables in your Supabase project:

- `users` - User profiles
- `accounts` - Bank accounts and credit cards
- `transactions` - Financial transactions
- `budgets` - Budget categories and limits
- `categories` - Transaction categories

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help, please open an issue on GitHub.