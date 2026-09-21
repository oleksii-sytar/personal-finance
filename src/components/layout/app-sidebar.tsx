'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/config/navigation'
import { useWorkspaceContext } from '@/contexts/workspace-context'
import { UserProfile } from '@/components/layout/user-profile'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { ROLE_LABELS } from '@/lib/auth/permissions'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { workspace, role, can } = useWorkspaceContext()
  const items = NAV_ITEMS.filter((i) => !i.permission || can(i.permission))

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-primary bg-secondary">
      <div className="flex h-20 items-center gap-3 border-b border-primary px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]">
          <span className="font-space-grotesk text-sm font-bold text-[var(--text-inverse)]">F</span>
        </div>
        <div className="min-w-0">
          <p className="font-space-grotesk text-base font-semibold text-primary">Forma</p>
          <p className="truncate text-xs text-muted">{workspace?.name ?? "Сім’я"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--ambient-glow)] text-[var(--accent-primary)]'
                  : 'text-secondary hover:bg-glass hover:text-primary'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-3 border-t border-primary p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted">Роль</span>
          <Badge tone="accent">{ROLE_LABELS[role]}</Badge>
        </div>
        <ThemeToggle />
        <UserProfile />
      </div>
    </aside>
  )
}