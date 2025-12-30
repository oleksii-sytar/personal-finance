import Link from 'next/link';
import { ArrowRight, DollarSign, PieChart, Target, TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-peat-charcoal">
      {/* Header */}
      <header className="glass-card mx-4 mt-4 mb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-single-malt" />
              <span className="ml-3 text-xl font-space-grotesk font-semibold text-white">
                Personal Finance
              </span>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/auth/login"
                className="secondary-button px-6 py-3"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="primary-button px-6 py-3"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-space-grotesk font-bold text-white mb-6">
            Take Control of Your
            <span className="text-single-malt block mt-2">Finances</span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-white/70 font-inter leading-relaxed">
            Track expenses, manage budgets, and gain insights into your financial habits with our intuitive personal finance management tool designed for the modern executive.
          </p>
          <div className="mt-10">
            <Link
              href="/auth/signup"
              className="primary-button px-10 py-4 text-lg inline-flex items-center"
            >
              Start Managing Your Money
              <ArrowRight className="ml-3 h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card p-8 text-center group hover:bg-white/8 transition-all duration-300">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-growth-emerald/20">
                <TrendingUp className="h-8 w-8 text-growth-emerald" />
              </div>
            </div>
            <h3 className="text-xl font-space-grotesk font-semibold text-white mb-4">
              Expense Tracking
            </h3>
            <p className="text-white/60 font-inter leading-relaxed">
              Monitor your spending with detailed categorization and intelligent insights.
            </p>
          </div>

          <div className="glass-card p-8 text-center group hover:bg-white/8 transition-all duration-300">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-single-malt/20">
                <Target className="h-8 w-8 text-single-malt" />
              </div>
            </div>
            <h3 className="text-xl font-space-grotesk font-semibold text-white mb-4">
              Budget Planning
            </h3>
            <p className="text-white/60 font-inter leading-relaxed">
              Set intelligent budgets and track your progress toward financial goals.
            </p>
          </div>

          <div className="glass-card p-8 text-center group hover:bg-white/8 transition-all duration-300">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-aged-oak/40">
                <PieChart className="h-8 w-8 text-aged-oak" />
              </div>
            </div>
            <h3 className="text-xl font-space-grotesk font-semibold text-white mb-4">
              Analytics & Reports
            </h3>
            <p className="text-white/60 font-inter leading-relaxed">
              Visualize your financial data with comprehensive, liquid-style reports.
            </p>
          </div>

          <div className="glass-card p-8 text-center group hover:bg-white/8 transition-all duration-300">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-single-malt/20">
                <DollarSign className="h-8 w-8 text-single-malt" />
              </div>
            </div>
            <h3 className="text-xl font-space-grotesk font-semibold text-white mb-4">
              Multi-Account Support
            </h3>
            <p className="text-white/60 font-inter leading-relaxed">
              Manage multiple accounts and get a complete financial picture.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="glass-card p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl font-space-grotesk font-bold text-white mb-6">
              Ready to Transform Your Financial Life?
            </h2>
            <p className="text-lg text-white/70 font-inter mb-8 leading-relaxed">
              Join thousands of users who have taken control of their finances with our executive-grade platform.
            </p>
            <Link
              href="/auth/signup"
              className="primary-button px-8 py-4 text-lg"
            >
              Get Started Today
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}