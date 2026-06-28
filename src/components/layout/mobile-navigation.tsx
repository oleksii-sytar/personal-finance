'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { UserProfile } from './user-profile'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
]

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  return (
    <>
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMenu}
          className="p-2 bg-glass border border-glass rounded-xl backdrop-blur-sm"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-primary" />
          ) : (
            <Menu className="w-6 h-6 text-primary" />
          )}
        </Button>
      </div>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-secondary border-r border-primary flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ visibility: isOpen ? 'visible' : 'hidden' }}
      >
        <div className="flex h-16 items-center px-6 border-b border-primary flex-shrink-0">
          <Link href="/" onClick={closeMenu} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)] rounded-lg flex items-center justify-center">
              <span className="text-inverse font-bold text-sm font-space-grotesk">F</span>
            </div>
            <span className="text-primary font-space-grotesk font-semibold text-lg">Forma</span>
          </Link>
        </div>

        <nav className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMenu}
                className="group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
              >
                <item.icon className="mr-3 h-6 w-6 text-[var(--accent-primary)]" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-6 border-t border-primary flex-shrink-0">
          <UserProfile />
        </div>
      </div>
    </>
  )
}
