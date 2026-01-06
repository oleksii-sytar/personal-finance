'use client'

import { cn } from '@/lib/utils'

interface FormaLogoLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  message?: string
}

/**
 * Magical Forma logo loader with Executive Lounge aesthetic
 * Features premium animations, ambient glow, and luxury materials
 */
export function FormaLogoLoader({ 
  size = 'lg', 
  className,
  message = 'Loading...'
}: FormaLogoLoaderProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg', 
    xl: 'text-xl'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      {/* Magical Logo Container */}
      <div className="relative">
        {/* Ambient Glow Background */}
        <div 
          className={cn(
            'absolute inset-0 rounded-full opacity-30 animate-pulse',
            'bg-gradient-radial from-[var(--accent-primary)] via-[var(--accent-primary)]/20 to-transparent',
            'blur-xl scale-150'
          )}
        />
        
        {/* Rotating Ring */}
        <div 
          className={cn(
            'absolute inset-0 rounded-full border-2 border-transparent',
            'bg-gradient-to-r from-[var(--accent-primary)] via-transparent to-[var(--accent-primary)]',
            'animate-spin',
            sizeClasses[size]
          )}
          style={{
            background: 'conic-gradient(from 0deg, var(--accent-primary), transparent 120deg, var(--accent-primary) 240deg, transparent)',
            maskImage: 'radial-gradient(circle, transparent 70%, black 72%, black 100%)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 70%, black 72%, black 100%)'
          }}
        />

        {/* Inner Pulsing Ring */}
        <div 
          className={cn(
            'absolute inset-2 rounded-full border border-[var(--accent-primary)]/40',
            'animate-pulse'
          )}
        />

        {/* Logo Container */}
        <div 
          className={cn(
            'relative flex items-center justify-center rounded-full',
            'bg-gradient-to-br from-[var(--bg-glass)] to-[var(--bg-secondary)]',
            'backdrop-blur-[16px] border border-[var(--border-glass)]',
            'shadow-2xl',
            sizeClasses[size]
          )}
        >
          {/* Forma Logo */}
          <div className="relative">
            {/* Logo Background Glow */}
            <div 
              className="absolute inset-0 bg-[var(--accent-primary)] rounded-lg opacity-20 blur-sm animate-pulse"
            />
            
            {/* Main Logo */}
            <div 
              className={cn(
                'relative font-bold text-[var(--accent-primary)] select-none',
                'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]',
                'bg-clip-text text-transparent',
                'animate-pulse',
                size === 'sm' ? 'text-lg' : 
                size === 'md' ? 'text-2xl' :
                size === 'lg' ? 'text-3xl' : 'text-4xl'
              )}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                letterSpacing: '-0.02em',
                textShadow: '0 0 20px var(--accent-primary)'
              }}
            >
              F
            </div>
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'absolute w-1 h-1 bg-[var(--accent-primary)] rounded-full opacity-60',
                  'animate-bounce'
                )}
                style={{
                  left: `${20 + (i * 12)}%`,
                  top: `${30 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        </div>

        {/* Outer Glow Ring */}
        <div 
          className={cn(
            'absolute -inset-4 rounded-full opacity-20',
            'bg-gradient-conic from-[var(--accent-primary)] via-transparent to-[var(--accent-primary)]',
            'animate-spin blur-md'
          )}
          style={{
            animationDuration: '3s'
          }}
        />
      </div>

      {/* Loading Message */}
      {message && (
        <div className="mt-8 text-center">
          <p 
            className={cn(
              'text-[var(--text-primary)] font-medium mb-2',
              textSizeClasses[size]
            )}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {message}
          </p>
          
          {/* Animated Dots */}
          <div className="flex items-center justify-center space-x-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 bg-[var(--accent-primary)] rounded-full',
                  'animate-bounce'
                )}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1.4s'
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Full-screen version of the Forma logo loader
 */
export function FullScreenFormaLoader({ 
  message = 'Loading...', 
  size = 'xl' 
}: FormaLogoLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div 
        className="absolute top-0 right-0 w-full h-full opacity-10"
        style={{
          background: 'radial-gradient(circle at 70% 30%, var(--accent-primary) 0%, transparent 50%)'
        }}
      />
      
      <FormaLogoLoader size={size} message={message} />
    </div>
  )
}