'use client'
import {usePathname} from 'next/navigation'
import {SmartRouteGuard} from '@/components/shared/smart-route-guard'
import {WorkspaceProvider} from '@/contexts/workspace-context'
import {QuickAddProvider} from '@/contexts/quick-add-context'
import {AppSidebar} from '@/components/layout/app-sidebar'
import {MobileTabBar} from '@/components/layout/mobile-tab-bar'
import {GlobalQuickAdd} from '@/components/transactions/global-quick-add'
import {WorkspaceGate} from '@/components/onboarding/workspace-gate'
import {FinanceStatus} from '@/components/layout/finance-status'
import {FinanceQueryErrors} from '@/components/layout/finance-query-errors'
export default function DashboardLayout({children}:{children:React.ReactNode}){
  const pathname=usePathname()
  return <SmartRouteGuard requireAuth><WorkspaceGate><WorkspaceProvider><QuickAddProvider>
    <div className="relative min-h-screen bg-[var(--bg-primary)]"><AppSidebar/><div className="lg:pl-64"><main className={"mx-auto w-full px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pb-10 lg:pt-8 "+(pathname==='/forecast'?'max-w-none':'max-w-6xl')}><FinanceStatus><FinanceQueryErrors/>{children}</FinanceStatus></main></div><MobileTabBar/><GlobalQuickAdd/></div>
  </QuickAddProvider></WorkspaceProvider></WorkspaceGate></SmartRouteGuard>
}