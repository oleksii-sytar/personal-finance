'use client'

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { UndoIcon, XIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

export interface UndoToast {
  id: string
  title: string
  description?: string
  onUndo: () => void | Promise<void>
  duration?: number
}

interface UndoToastContextType {
  showUndoToast: (toast: Omit<UndoToast, 'id'>) => void
  removeUndoToast: (id: string) => void
}

const UndoToastContext = createContext<UndoToastContextType | undefined>(undefined)

export function useUndoToast() {
  const context = useContext(UndoToastContext)
  if (!context) {
    throw new Error('useUndoToast must be used within an UndoToastProvider')
  }
  return context
}

interface UndoToastProviderProps {
  children: ReactNode
}

export function UndoToastProvider({ children }: UndoToastProviderProps) {
  const [toasts, setToasts] = useState<UndoToast[]>([])

  const showUndoToast = useCallback((toast: Omit<UndoToast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto-remove toast after duration (default 10 seconds for undo - Requirement 6.3)
    const duration = toast.duration ?? 10000
    if (duration > 0) {
      setTimeout(() => {
        removeUndoToast(id)
      }, duration)
    }
  }, [])

  const removeUndoToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const value = {
    showUndoToast,
    removeUndoToast
  }

  return (
    <UndoToastContext.Provider value={value}>
      {children}
      <UndoToastContainer toasts={toasts} onRemove={removeUndoToast} />
    </UndoToastContext.Provider>
  )
}

interface UndoToastContainerProps {
  toasts: UndoToast[]
  onRemove: (id: string) => void
}

function UndoToastContainer({ toasts, onRemove }: UndoToastContainerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <UndoToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  )
}

interface UndoToastItemProps {
  toast: UndoToast
  onRemove: (id: string) => void
}

function UndoToastItem({ toast, onRemove }: UndoToastItemProps) {
  const [timeLeft, setTimeLeft] = useState(toast.duration ?? 10000)
  const [isUndoing, setIsUndoing] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(interval)
          return 0
        }
        return prev - 100
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const handleUndo = async () => {
    setIsUndoing(true)
    try {
      await toast.onUndo()
      onRemove(toast.id)
    } catch (error) {
      console.error('Undo failed:', error)
      setIsUndoing(false)
    }
  }

  const progressPercentage = ((toast.duration ?? 10000) - timeLeft) / (toast.duration ?? 10000) * 100

  return (
    <div className={cn(
      'relative p-4 rounded-lg border backdrop-blur-sm',
      'bg-[var(--bg-glass)] border-[var(--border-glass)]',
      'animate-in slide-in-from-bottom-full duration-300',
      'shadow-lg'
    )}>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-[var(--accent-primary)]/20 rounded-b-lg w-full overflow-hidden">
        <div 
          className="h-full bg-[var(--accent-primary)] transition-all duration-100 ease-linear"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--accent-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">{toast.title}</h4>
          {toast.description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{toast.description}</p>
          )}
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Undo available for {Math.ceil(timeLeft / 1000)} seconds
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleUndo}
            disabled={isUndoing}
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
          >
            {isUndoing ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UndoIcon className="w-4 h-4 mr-1" />
                Undo
              </>
            )}
          </Button>
          
          <button
            onClick={() => onRemove(toast.id)}
            disabled={isUndoing}
            className="flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            aria-label="Dismiss"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}