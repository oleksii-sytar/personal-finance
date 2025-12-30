import Link from 'next/link';
import { ArrowRight, DollarSign, PieChart, Target, TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Personal Finance
              </span>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Take Control of Your
            <span className="text-blue-600"> Finances</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Track expenses, manage budgets, and gain insights into your financial habits with our intuitive personal finance management tool.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <Link
              href="/auth/signup"
              className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
            >
              Start Managing Your Money
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <TrendingUp className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Expense Tracking
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Monitor your spending with detailed categorization and insights.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <Target className="h-12 w-12 text-blue-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Budget Planning
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Set budgets and track your progress toward financial goals.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <PieChart className="h-12 w-12 text-purple-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Analytics & Reports
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Visualize your financial data with comprehensive reports.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <DollarSign className="h-12 w-12 text-yellow-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Multi-Account Support
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Manage multiple accounts and get a complete financial picture.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}