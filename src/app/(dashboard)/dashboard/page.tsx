'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Mock data for demonstration
const mockStats = {
  totalBalance: 12450.75,
  monthlyIncome: 5200.00,
  monthlyExpenses: 3180.25,
  savingsRate: 38.8,
};

const mockRecentTransactions = [
  { id: '1', description: 'Grocery Store', amount: -85.32, category: 'Food & Dining', date: '2024-01-15' },
  { id: '2', description: 'Salary Deposit', amount: 2600.00, category: 'Salary', date: '2024-01-15' },
  { id: '3', description: 'Electric Bill', amount: -120.45, category: 'Bills & Utilities', date: '2024-01-14' },
  { id: '4', description: 'Coffee Shop', amount: -4.75, category: 'Food & Dining', date: '2024-01-14' },
  { id: '5', description: 'Gas Station', amount: -45.20, category: 'Transportation', date: '2024-01-13' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(mockStats);
  const [transactions, setTransactions] = useState(mockRecentTransactions);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your financial overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Balance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.totalBalance)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Income</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.monthlyIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats.monthlyExpenses)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Savings Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.savingsRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {transaction.description}
                </p>
                <p className="text-sm text-gray-500">{transaction.category}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                </p>
                <p className="text-sm text-gray-500">{transaction.date}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-gray-50 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            View all transactions
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <h3 className="font-medium text-gray-900">Add Transaction</h3>
            <p className="text-sm text-gray-500">Record a new income or expense</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <h3 className="font-medium text-gray-900">Create Budget</h3>
            <p className="text-sm text-gray-500">Set up a new budget category</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <h3 className="font-medium text-gray-900">View Reports</h3>
            <p className="text-sm text-gray-500">Analyze your spending patterns</p>
          </button>
        </div>
      </div>
    </div>
  );
}