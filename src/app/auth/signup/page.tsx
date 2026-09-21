import {Suspense} from 'react'
import {RegisterForm} from '@/components/forms/register-form'
export const metadata={title:'Приєднатися до сім’ї | Forma',referrer:'no-referrer' as const}
export default function SignUpPage(){return <main className="flex min-h-screen items-center justify-center px-4 py-10"><div className="w-full max-w-md"><p className="mb-6 text-center font-space-grotesk text-2xl font-semibold">Forma</p><Suspense fallback={<p role="status">Відкриваємо запрошення…</p>}><RegisterForm/></Suspense></div></main>}
