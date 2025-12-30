'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ClientThemeToggle, ClientThemeToggleCompact } from '@/components/ui/ClientThemeToggle';
import { TrendingUp, DollarSign, Target, PieChart } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen p-6 lg:p-8">
      {/* Header with Theme Toggle */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-primary text-3xl lg:text-4xl text-accent-primary mb-2">
            Executive Finance Suite
          </h1>
          <p className="body-text text-lg">
            Distilled control over your financial landscape
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ClientThemeToggleCompact />
          <ClientThemeToggle />
        </div>
      </header>

      {/* Demo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Net Worth Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-accent-primary" />
              Net Worth Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-text-muted text-sm mb-1">Total Net Worth</p>
                <p className="heading-primary text-3xl text-accent-primary">$247,850</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4">
                  <p className="text-text-muted text-sm">Assets</p>
                  <p className="heading-primary text-xl text-accent-success">$312,400</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-text-muted text-sm">Liabilities</p>
                  <p className="heading-primary text-xl text-red-400">$64,550</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card variant="leather">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-accent-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="primary-button w-full py-3 px-4">
                Add Transaction
              </button>
              <button className="secondary-button w-full py-3 px-4">
                View Reports
              </button>
              <button className="secondary-button w-full py-3 px-4">
                Set Budget Goal
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Budget Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Target className="w-6 h-6 text-accent-primary" />
              Monthly Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">Spent</span>
                  <span className="text-text-primary">$2,840 / $4,000</span>
                </div>
                <div className="w-full bg-background-secondary rounded-pill h-3 overflow-hidden">
                  <div 
                    className="progress-liquid h-full rounded-pill"
                    style={{ width: '71%' }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-muted">Remaining</p>
                  <p className="text-accent-success font-medium">$1,160</p>
                </div>
                <div>
                  <p className="text-text-muted">Days Left</p>
                  <p className="text-text-primary font-medium">12 days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <PieChart className="w-6 h-6 text-accent-primary" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Whole Foods Market', amount: '-$127.45', category: 'Groceries', time: '2 hours ago' },
                { name: 'Salary Deposit', amount: '+$4,200.00', category: 'Income', time: '1 day ago' },
                { name: 'Netflix Subscription', amount: '-$15.99', category: 'Entertainment', time: '2 days ago' },
                { name: 'Gas Station', amount: '-$52.30', category: 'Transportation', time: '3 days ago' },
              ].map((transaction, index) => (
                <div key={index} className="glass-card p-4 hover:bg-background-glass">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-primary font-medium">{transaction.name}</p>
                      <p className="text-text-muted text-sm">{transaction.category} • {transaction.time}</p>
                    </div>
                    <p className={`font-semibold ${
                      transaction.amount.startsWith('+') ? 'text-accent-success' : 'text-red-400'
                    }`}>
                      {transaction.amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Theme Demo Section */}
      <Card variant="glass" className="mb-8">
        <CardHeader>
          <CardTitle>Design System Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="heading-primary text-lg mb-3">Typography</h4>
              <div className="space-y-2">
                <p className="heading-primary text-xl">Executive Heading</p>
                <p className="body-text">Professional body text with perfect readability</p>
                <p className="text-text-muted text-sm">Subtle muted text for secondary information</p>
              </div>
            </div>
            <div>
              <h4 className="heading-primary text-lg mb-3">Buttons</h4>
              <div className="space-y-3">
                <button className="primary-button px-6 py-2">Primary Action</button>
                <button className="secondary-button px-6 py-2">Secondary Action</button>
              </div>
            </div>
            <div>
              <h4 className="heading-primary text-lg mb-3">Input Fields</h4>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Glass input field"
                  className="input-glass w-full px-4 py-3"
                />
                <input 
                  type="number" 
                  placeholder="Amount"
                  className="input-glass w-full px-4 py-3"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="text-center text-text-muted">
        <p>Forma Design System • Executive Finance Suite</p>
        <p className="text-sm mt-1">Experience the luxury of financial clarity</p>
      </footer>
    </main>
  );
}