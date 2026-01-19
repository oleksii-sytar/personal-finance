'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-full mx-4'
}

/**
 * Reusable Modal component with consistent styling
 * Fixes top margin issue by using proper vertical alignment
 * Implements Executive Lounge design system
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  className
}: ModalProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!mounted || (!isOpen && !isClosing)) return null

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      handleClose()
    }
  }

  const modalContent = (
    <div 
      className={cn(
        'fixed inset-0 z-50',
        'flex items-start sm:items-center justify-center',
        'pt-16 sm:pt-0 p-4',
        'bg-black/50 backdrop-blur-sm',
        'transition-opacity duration-200',
        'overflow-y-auto',
        isClosing ? 'opacity-0' : 'opacity-100'
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className={cn(
          'w-full',
          sizeClasses[size],
          'max-h-[calc(100vh-8rem)] sm:max-h-[90vh]',
          'bg-primary border border-glass rounded-2xl shadow-2xl',
          'transition-transform duration-200',
          'overflow-hidden flex flex-col',
          isClosing ? 'scale-95' : 'scale-100',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-glass flex-shrink-0">
            {title && (
              <h2 className="text-xl font-semibold text-primary">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-2 hover:bg-glass rounded-lg ml-auto"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}

        {/* Modal Content */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

/**
 * Modal Header component for consistent header styling
 */
export function ModalHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-6 border-b border-glass', className)}>
      {children}
    </div>
  )
}

/**
 * Modal Body component for consistent content styling
 */
export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}

/**
 * Modal Footer component for consistent footer styling
 */
export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-6 border-t border-glass flex items-center justify-end gap-3', className)}>
      {children}
    </div>
  )
}
