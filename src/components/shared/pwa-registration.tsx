'use client'

import { useEffect } from 'react'

export function PwaRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((error) => {
        console.warn('Offline fallback could not be registered', error)
      })
    }
  }, [])
  return null
}