import {Suspense} from 'react'
import {AiConnections} from '@/components/settings/ai-connections'
export default function Page(){return <Suspense fallback={<p role="status">Завантаження підключень…</p>}><AiConnections/></Suspense>}