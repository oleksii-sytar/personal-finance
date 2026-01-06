'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { QuickEntryForm } from './quick-entry-form'

interface FloatingAddButtonProps {
  className?: string
  onTransactionCreated?: (transaction: any) => void
}

/**
 * FloatingAddButton component for quick transaction entry
 * Implements Requirement 1.1: Floating "+" button on main screens
 * Provides immediate access to quick entry form
 */
export function FloatingAddButton({ 
  className = '', 
  onTransactionCreated 
}: FloatingAddButtonProps) {
  const [showForm, setShowForm] = useState(false)

  const handleSuccess = (transaction: any) => {
    setShowForm(false)
    if (onTransactionCreated) {
      onTransactionCreated(transaction)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
  }

  return (
    <>
      {/* Floating Add Button */}
      <button
        onClick={() => setShowForm(true)}
        className={`
          fixed bottom-6 right-6 z-50
          w-14 h-14 
          bg-gradient-to-br from-accent-primary to-accent-primary
          hover:from-accent-primary hover:to-accent-secondary
          text-inverse
          rounded-full
          shadow-lg hover:shadow-xl
          transition-all duration-200
          flex items-center justify-center
          text-2xl font-light
          hover:scale-105
          active:scale-95
          focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:ring-offset-2
          ${className}
        `}
        aria-label="Add new transaction"
        title="Add new transaction"
      >
        +
      </button>

      {/* Modal Overlay and Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
          />
          
          {/* Form Container */}
          <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0">
            <QuickEntryForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}
    </>
  )
}