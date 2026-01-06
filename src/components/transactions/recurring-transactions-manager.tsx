'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { RecurringTransactionForm } from './recurring-transaction-form'
import { RecurringTransactionList } from './recurring-transaction-list'
import { ExpectedTransactionList } from './expected-transaction-list'
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions'
import { Plus, Calendar, Clock, Settings } from 'lucide-react'

interface RecurringTransactionsManagerProps {
  workspaceId: string
}

export function RecurringTransactionsManager({ workspaceId }: RecurringTransactionsManagerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'recurring' | 'expected' | 'create'>('overview')
  const { 
    recurringTransactions, 
    pendingExpectedTransactions, 
    isLoading, 
    error, 
    refetch 
  } = useRecurringTransactions(workspaceId)

  const handleCreateSuccess = () => {
    setActiveTab('overview')
    refetch()
  }

  const tabs = [
    { 
      id: 'overview' as const, 
      label: 'Overview', 
      icon: Calendar,
      count: pendingExpectedTransactions.length 
    },
    { 
      id: 'recurring' as const, 
      label: 'Recurring', 
      icon: Settings,
      count: recurringTransactions.filter(rt => rt.is_active).length 
    },
    { 
      id: 'expected' as const, 
      label: 'Expected', 
      icon: Clock,
      count: pendingExpectedTransactions.length 
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-glass rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-glass rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refetch} variant="secondary">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Recurring Transactions</h1>
          <p className="text-secondary mt-1">
            Manage your recurring income and expenses
          </p>
        </div>
        
        {activeTab !== 'create' && (
          <Button
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Recurring
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      {activeTab !== 'create' && (
        <div className="flex space-x-1 bg-glass p-1 rounded-lg border border-glass">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent-primary text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-glass'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-accent-primary/10 text-accent-primary'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {activeTab === 'create' && (
        <RecurringTransactionForm
          workspaceId={workspaceId}
          onSuccess={handleCreateSuccess}
          onCancel={() => setActiveTab('overview')}
        />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-primary/10 rounded-lg">
                  <Settings className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <p className="text-sm text-secondary">Active Recurring</p>
                  <p className="text-xl font-semibold text-primary">
                    {recurringTransactions.filter(rt => rt.is_active).length}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-secondary">Pending Expected</p>
                  <p className="text-xl font-semibold text-primary">
                    {pendingExpectedTransactions.length}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-secondary">Total Recurring</p>
                  <p className="text-xl font-semibold text-primary">
                    {recurringTransactions.length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Pending Expected Transactions */}
          {pendingExpectedTransactions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-primary mb-4">
                Pending Expected Transactions
              </h2>
              <ExpectedTransactionList workspaceId={workspaceId} showAll={false} />
            </div>
          )}

          {/* Recent Recurring Transactions */}
          {recurringTransactions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-primary mb-4">
                Recent Recurring Transactions
              </h2>
              <RecurringTransactionList workspaceId={workspaceId} />
            </div>
          )}

          {/* Empty State */}
          {recurringTransactions.length === 0 && (
            <Card className="p-8">
              <div className="text-center">
                <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-primary mb-2">
                  No Recurring Transactions
                </h3>
                <p className="text-secondary mb-6">
                  Set up recurring transactions to automatically track regular income and expenses like rent, salary, or subscriptions.
                </p>
                <Button onClick={() => setActiveTab('create')}>
                  Create Your First Recurring Transaction
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'recurring' && (
        <RecurringTransactionList workspaceId={workspaceId} />
      )}

      {activeTab === 'expected' && (
        <ExpectedTransactionList workspaceId={workspaceId} showAll={true} />
      )}
    </div>
  )
}