'use client'

import {HistoryCoverage} from '@/components/settings/history-coverage'
import {ReserveCategories,ForecastCategories} from '@/components/settings/reserve-categories'
import {AiConnectionsLink} from '@/components/settings/ai-connections'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { CategoryRulesManager } from '@/components/settings/category-rules-manager'
import {AccountPreferences} from '@/components/settings/account-preferences'
import {ImportReminderCard} from '@/components/settings/import-reminders'
import { UserSettingsForm } from '@/components/settings/user-settings-form'
import { StatementImportPrompt } from '@/components/settings/statement-import-prompt'
import { MembersCard } from '@/components/settings/members-card'
import { GettingStarted } from '@/components/onboarding/getting-started'
import { useWorkspaceContext } from '@/contexts/workspace-context'
import { useAuth } from '@/contexts/auth-context'
import { ROLE_LABELS } from '@/lib/auth/permissions'

export default function SettingsPage() {
  const { workspace, role } = useWorkspaceContext()
  const { signOut } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    try {
      await signOut()
    } finally {
      router.push('/auth/login?logout=success')
    }
  }

  return (
    <>
      <PageHeader title="Налаштування" subtitle="Особисті налаштування, сім’я та оформлення" />
      <details className="mb-6"><summary className="cursor-pointer text-sm text-[var(--accent-primary)]">Як почати облік: покрокова інструкція</summary><div className="mt-4"><GettingStarted always /></div></details>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-1">Сім’я</CardTitle>
          <p className="mb-4 text-sm text-secondary">
            {workspace?.name} · ваша роль: <Badge tone="accent">{ROLE_LABELS[role]}</Badge>
          </p>
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary">Оформлення</p>
            <ThemeToggle />
          </div>
          <div className="mt-6 border-t border-primary pt-4">
            <Button variant="ghost" onClick={handleSignOut} className="text-[var(--accent-error)]">
              <LogOut className="mr-1.5 h-4 w-4" /> Вийти
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4">Особисті налаштування</CardTitle>
          <UserSettingsForm />
        </Card>

        <Card><CardTitle className="mb-4">Рахунки для додавання операцій</CardTitle><AccountPreferences/></Card>
        <Card><CardTitle className="mb-4">Повнота історії</CardTitle><HistoryCoverage/></Card>
        <div id="forecast-categories" className="scroll-mt-6"><Card><CardTitle className="mb-4">Категорії щоденних витрат</CardTitle><ForecastCategories/></Card></div>
        <div id="reserve-categories" className="scroll-mt-6"><Card><CardTitle className="mb-4">Базові потреби для резерву</CardTitle><ReserveCategories/></Card></div>
        <AiConnectionsLink/>
        <ImportReminderCard/>
        <CategoryRulesManager />
        <StatementImportPrompt />

        <div className="lg:col-span-2">
          <MembersCard />
        </div>
      </div>
    </>
  )
}
