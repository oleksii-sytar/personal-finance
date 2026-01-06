'use client'

import { useState } from 'react'
import { FormaLogoLoader, FullScreenFormaLoader } from '@/components/shared/forma-logo-loader'
import { Button } from '@/components/ui/Button'

export default function TestLoaderPage() {
  const [showFullScreen, setShowFullScreen] = useState(false)

  if (showFullScreen) {
    return <FullScreenFormaLoader message="Magical loading in progress..." />
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">
          Magical Forma Logo Loader Test
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Small Size */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Small Size</h2>
            <FormaLogoLoader size="sm" message="Loading small..." />
          </div>

          {/* Medium Size */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Medium Size</h2>
            <FormaLogoLoader size="md" message="Loading medium..." />
          </div>

          {/* Large Size */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Large Size</h2>
            <FormaLogoLoader size="lg" message="Loading large..." />
          </div>

          {/* Extra Large Size */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Extra Large Size</h2>
            <FormaLogoLoader size="xl" message="Loading extra large..." />
          </div>
        </div>

        <div className="glass-card p-6 text-center">
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Full Screen Test</h2>
          <p className="text-[var(--text-secondary)] mb-4">
            Click the button below to see the full-screen magical loader
          </p>
          <Button 
            onClick={() => setShowFullScreen(true)}
            className="btn-primary"
          >
            Show Full Screen Loader
          </Button>
          {showFullScreen && (
            <Button 
              onClick={() => setShowFullScreen(false)}
              className="btn-secondary ml-4"
            >
              Hide Loader
            </Button>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Features</h2>
          <ul className="text-[var(--text-secondary)] space-y-2">
            <li>✨ Animated Forma logo with gradient text</li>
            <li>🌟 Rotating outer ring with conic gradient</li>
            <li>💫 Pulsing inner ring</li>
            <li>🎭 Floating particles animation</li>
            <li>🌅 Ambient glow background</li>
            <li>🎨 Executive Lounge aesthetic</li>
            <li>📱 Responsive sizing (sm, md, lg, xl)</li>
            <li>🎯 Custom loading messages</li>
          </ul>
        </div>
      </div>
    </div>
  )
}