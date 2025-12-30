'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Plus, ArrowUpRight, ArrowDownRight, Target, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Mock data for demonstration
const mockStats = {
  totalBalance: 12450.75,
  monthlyIncome: 5200.00,
  monthlyExpenses: 3180.25,
  savingsRate: 38.8,
};

const mockRecentTransactions = [
  { id: '1', description: 'Grocery Store', amount: -85.32, category: 'Food & Dining', date: '2024-01-15', type: 'expense' },
  { id: '2', description: 'Salary Deposit', amount: 2600.00, category: 'Salary', date: '2024-01-15', type: 'income' },
  { id: '3', description: 'Electric Bill', amount: -120.45, category: 'Bills & Utilities', date: '2024-01-14', type: 'expense' },
  { id: '4', description: 'Coffee Shop', amount: -4.75, category: 'Food & Dining', date: '2024-01-14', type: 'expense' },
  { id: '5', description: 'Gas Station', amount: -45.20, category: 'Transportation', date: '2024-01-13', type: 'expense' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(mockStats);
  const [transactions, setTransactions] = useState(mockRecentTransactions);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white mb-2">
          Executive Dashboard
        </h1>
        <p className="text-white/60 font-inter text-lg">
          Welcome back. Here's your financial overview at a glance.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-8 group hover:bg-white/8 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-full bg-single-malt/20">
              <DollarSign className="h-6 w-6 text-single-malt" />
            </div>
            <TrendingUp className="h-5 w-5 text-growth-emerald" />
          </div>
          <div>
            <p className="text-sm font-inter text-white/60 mb-1">Total Balance</p>
            <p className="text-3xl font-space-grotesk font-bold text-single-malt">
              {formatCurrency(stats.totalBalance)}
            </p>
          </div>
        </div>

        <div className="glass-card p-8 group hover:bg-white/8 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-full bg-growth-emerald/20">
              <ArrowUpRight className="h-6 w-6 text-growth-emerald" />
            </div>
            <span className="text-xs font-inter text-white/40">This Month</span>
          </div>
          <div>
            <p className="text-sm font-inter text-white/60 mb-1">Monthly Income</p>
            <p className="text-3xl font-space-grotesk font-bold text-white">
              {formatCurrency(stats.monthlyIncome)}
            </p>
          </div>
        </div>

        <div className="glass-card p-8 group hover:bg-white/8 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-full bg-red-400/20">
              <ArrowDownRight className="h-6 w-6 text-red-400" />
            </div>
            <span className="text-xs font-inter text-white/40">This Month</span>
          </div>
          <div>
            <p className="text-sm font-inter text-white/60 mb-1">Monthly Expenses</p>
            <p className="text-3xl font-space-grotesk font-bold text-white">
              {formatCurrency(stats.monthlyExpenses)}
            </p>
          </div>
        </div>

        <div className="glass-card p-8 group hover:bg-white/8 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-full bg-aged-oak/40">
              <CreditCard className="h-6 w-6 text-aged-oak" />
            </div>
            <TrendingUp className="h-5 w-5 text-growth-emerald" />
          </div>
          <div>
            <p className="text-sm font-inter text-white/60 mb-1">Savings Rate</p>
            <p className="text-3xl font-space-grotesk font-bold text-white">
              {stats.savingsRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-space-grotesk font-semibold text-white">
            Recent Transactions
          </h2>
          <button className="secondary-button px-4 py-2 text-sm">
            View All
          </button>
        </div>
        
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 rounded-glass hover:bg-white/5 transition-all duration-300 border border-white/5">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${
                  transaction.type === 'income' 
                    ? 'bg-growth-emerald/20' 
                    : 'bg-red-400/20'
                }`}>
                  {transaction.type === 'income' ? (
                    <ArrowUpRight className="h-4 w-4 text-growth-emerald" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <div>
                  <p className="font-inter font-medium text-white">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-white/50 font-inter">
                    {transaction.category} • {transaction.date}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-space-grotesk font-semibold ${
                  transaction.amount > 0 ? 'text-growth-emerald' : 'text-white'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-8">
        <h2 className="text-2xl font-space-grotesk font-semibold text-white mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <button className="glass-card p-6 hover:bg-white/8 transition-all duration-300 text-left group border border-white/10">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-single-malt/20 group-hover:bg-single-malt/30 transition-colors">
                <Plus className="h-5 w-5 text-single-malt" />
              </div>
            </div>
            <h3 className="font-space-grotesk font-semibold text-white mb-2">Add Transaction</h3>
            <p className="text-sm text-white/60 font-inter">Record a new income or expense</p>
          </button>
          
          <button className="glass-card p-6 hover:bg-white/8 transition-all duration-300 text-left group border border-white/10">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-aged-oak/40 group-hover:bg-aged-oak/50 transition-colors">
                <Target className="h-5 w-5 text-aged-oak" />
              </div>
            </div>
            <h3 className="font-space-grotesk font-semibold text-white mb-2">Create Budget</h3>
            <p className="text-sm text-white/60 font-inter">Set up a new budget category</p>
          </button>
          
          <button className="glass-card p-6 hover:bg-white/8 transition-all duration-300 text-left group border border-white/10">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-growth-emerald/20 group-hover:bg-growth-emerald/30 transition-colors">
                <BarChart3 className="h-5 w-5 text-growth-emerald" />
              </div>
            </div>
            <h3 className="font-space-grotesk font-semibold text-white mb-2">View Reports</h3>
            <p className="text-sm text-white/60 font-inter">Analyze your spending patterns</p>
          </button>
        </div>
      </div>
    </div>
  );
}