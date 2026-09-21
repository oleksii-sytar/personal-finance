'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {MoreHorizontal} from 'lucide-react'
import {NAV_ITEMS} from '@/config/navigation'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {cn} from '@/lib/utils'

const TABS=NAV_ITEMS.filter(item=>item.primary)
/** Persistent navigation, with the home screen in the centre. */
export function MobileTabBar(){
 const {can}=useWorkspaceContext(),moreLinks=NAV_ITEMS.filter(item=>!item.primary&&(!item.permission||can(item.permission)))
 const pathname=usePathname(),matches=(href:string)=>pathname===href||pathname.startsWith(href+'/'),moreActive=!TABS.some(item=>matches(item.href))
 return <nav aria-label="Основна навігація" className="mobile-navigation fixed inset-x-0 bottom-0 z-40 border-t border-primary bg-[var(--bg-primary)] pb-[env(safe-area-inset-bottom)] lg:hidden">
 <div className="grid grid-cols-5 items-end">{TABS.map(item=>{
  const active=matches(item.href),home=item.href==='/dashboard',Icon=item.icon
  return <Link key={item.href} href={item.href} aria-current={active?'page':undefined} className={cn('mobile-navigation-link',home&&'mobile-navigation-home',active&&'mobile-navigation-active')}>
  {home?<span className="mobile-home-icon"><Icon size={24}/></span>:<Icon size={20}/>}<span>{item.label}</span></Link>
 })}
 <details className="relative min-w-0"><summary className={cn('mobile-navigation-link cursor-pointer list-none [&::-webkit-details-marker]:hidden',moreActive&&'mobile-navigation-active')}><MoreHorizontal size={20}/><span>Ще</span></summary>
 <div className="absolute bottom-full right-2 mb-3 max-h-[70dvh] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-primary bg-[var(--bg-primary)] p-2 shadow-xl">{moreLinks.map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href?'page':undefined} onClick={event=>event.currentTarget.closest('details')?.removeAttribute('open')} className="flex min-h-12 items-center rounded-xl px-4 text-sm text-primary hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{item.label}</Link>)}</div>
 </details></div></nav>
}