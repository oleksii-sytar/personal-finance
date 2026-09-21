import Link from 'next/link'
import {ArrowLeft} from 'lucide-react'
import {LiquidityCard} from '@/components/dashboard/liquidity-card'
export default function ForecastPage(){return <div className="finance-page"><header className="finance-page-heading"><div><p className="finance-eyebrow">Планування</p><h1>Гроші наперед</h1></div><Link className="finance-icon-button" aria-label="Повернутися до огляду" href="/dashboard"><ArrowLeft size={20}/></Link></header><LiquidityCard detailed/></div>}
