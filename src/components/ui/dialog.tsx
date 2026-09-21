'use client'

import { useEffect, useRef } from 'react'
import {useVisualViewport} from '@/hooks/use-visual-viewport'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Legacy variant hint; every dialog stays centered inside the safe viewport. */
  variant?: 'center' | 'sheet'
  className?: string
}

/**
 * Accessible centered modal. Locks scroll, closes on Esc and backdrop
 * click, and traps initial focus. Mounted only while open.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
  className,
}: DialogProps) {
  const viewport=useVisualViewport(open)
  useEffect(()=>{if(!open)return;const frame=requestAnimationFrame(()=>{const el=document.activeElement;if((el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement)&&typeof el.scrollIntoView==='function')el.scrollIntoView({block:'nearest'})});return()=>cancelAnimationFrame(frame)},[open,viewport])
  const rootRef=useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const announce=()=>document.dispatchEvent(new Event('forma:dialog-change'))
    announce()
    const onKey = (e: KeyboardEvent) => {
      const dialogs=document.querySelectorAll('[data-dialog-root]')
      if(dialogs[dialogs.length-1]!==rootRef.current)return
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'Tab') {
        const focusable = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        ) ?? []).filter((element) => element.getClientRects().length > 0)
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!first) {
          e.preventDefault()
          panelRef.current?.focus()
        } else if (!rootRef.current?.contains(document.activeElement)) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previousFocus?.focus()
      queueMicrotask(announce)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-x-0 z-[100] flex items-center justify-center"
      data-dialog-root
      ref={rootRef}
      data-dialog-variant={variant}
      style={{top:viewport?.top??0,height:viewport?.height??'100dvh','--dialog-gap-top':'calc(env(safe-area-inset-top, 0px) + 16px)','--dialog-gap-bottom':'calc(env(safe-area-inset-bottom, 0px) + 16px)',paddingTop:'var(--dialog-gap-top)',paddingBottom:'var(--dialog-gap-bottom)',paddingLeft:'calc(env(safe-area-inset-left, 0px) + 16px)',paddingRight:'calc(env(safe-area-inset-right, 0px) + 16px)'} as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-on-motion"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-[101] min-h-0 min-w-0 w-full max-w-lg"
      >
        <div
          style={{'--dialog-height':viewport?viewport.height+'px':'100dvh'} as React.CSSProperties}
          ref={panelRef}
          tabIndex={-1}
          className={cn(
            'glass-card-elevated flex max-h-[calc(var(--dialog-height,100dvh)-var(--dialog-gap-top)-var(--dialog-gap-bottom))] min-w-0 flex-col overflow-hidden rounded-glass bg-glass-dropdown outline-none',
            className
          )}
        >
          {(title || description) && (
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="min-w-0 break-words">
                {title && (
                  <h2 className="font-space-grotesk text-xl font-semibold text-primary">{title}</h2>
                )}
                {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрити"
                className="nav-item -mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div data-dialog-content className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
          {footer && <div data-dialog-footer className="shrink-0 border-t border-primary bg-[var(--bg-primary)] px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

export function DialogActions({children}:{children:React.ReactNode}) {
  return <div className="flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">{children}</div>
}