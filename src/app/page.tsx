'use client';

import { ClientThemeToggle } from '@/components/ui/ClientThemeToggle';
import { LayoutGrid, PieChart, Settings, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-border-primary/20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center">
              <span className="text-ink-grey font-bold text-sm">F</span>
            </div>
            <span className="text-text-primary font-space-grotesk font-semibold text-lg">Forma</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <button className="nav-active px-4 py-2 text-sm font-medium">Dashboard</button>
            <button className="text-text-secondary hover:text-text-primary px-4 py-2 text-sm font-medium transition-colors">Portfolio</button>
            <button className="text-text-secondary hover:text-text-primary px-4 py-2 text-sm font-medium transition-colors">Inventory</button>
            <button className="text-text-secondary hover:text-text-primary px-4 py-2 text-sm font-medium transition-colors">Settings</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ClientThemeToggle />
          <button className="text-text-secondary hover:text-text-primary text-sm font-medium">Log in</button>
          <button className="primary-button px-6 py-2 text-sm">Sign up</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="text-center py-16 px-8">
        <h1 className="heading-primary text-5xl md:text-7xl font-bold text-text-primary mb-4">
          Master Your Finances. In Style.
        </h1>
        <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto">
          Apple-level minimalism meets executive warmth.
        </p>
      </div>

      {/* Main Dashboard Layout */}
      <div className="flex gap-6 px-8 pb-8">
        {/* Left Sidebar */}
        <div className="w-64 sidebar-leather rounded-glass p-6">
          {/* macOS Window Controls */}
          <div className="flex gap-2 mb-8">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <button className="nav-active w-full flex items-center gap-3 px-4 py-3 text-left">
              <LayoutGrid className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-text-secondary hover:text-text-primary transition-colors">
              <PieChart className="w-5 h-5" />
              <span className="font-medium">Portfolio</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-text-secondary hover:text-text-primary transition-colors">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Net Worth Card */}
          <div className="glass-card p-8 mb-6 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-text-muted text-sm mb-2">Total Net Worth</p>
              <h2 className="heading-primary text-5xl font-bold text-text-primary mb-8">$128,450.00</h2>
              
              {/* Chart Area */}
              <div className="h-32 relative">
                <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 Q50,60 100,65 T200,55 T300,45 T400,35"
                    stroke="var(--accent-primary)"
                    strokeWidth="3"
                    fill="none"
                    className="drop-shadow-lg"
                  />
                  <path
                    d="M0,80 Q50,60 100,65 T200,55 T300,45 T400,35 L400,120 L0,120 Z"
                    fill="url(#chartGradient)"
                  />
                </svg>
              </div>
            </div>
            
            {/* Ambient Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/10 via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Right Sidebar - Recent Activity */}
        <div className="w-80 glass-card p-6">
          <h3 className="heading-primary text-lg font-semibold text-text-primary mb-6">Recent Activity</h3>
          
          <div className="space-y-4">
            {[
              { type: 'Account', description: 'Apr 25', amount: '+$4,680.00', positive: true },
              { type: 'Transaction', description: 'Salary', amount: '-$93.00', positive: false },
              { type: 'Transaction', description: 'Charge', amount: '-$85.00', positive: false },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-border-primary/10 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-background-secondary rounded-lg flex items-center justify-center">
                    {item.positive ? (
                      <ArrowUpRight className="w-4 h-4 text-accent-success" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-text-primary text-sm font-medium">{item.type}</p>
                    <p className="text-text-muted text-xs">{item.description}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  item.positive ? 'text-accent-success' : 'text-red-400'
                }`}>
                  {item.amount}
                </span>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 text-center text-text-muted text-sm hover:text-text-primary transition-colors">
            View all →
          </button>
        </div>
      </div>
    </div>
  );
}