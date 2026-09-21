'use client'
import {useEffect,useRef,type InputHTMLAttributes,type ReactNode} from 'react'
import {Check,Minus} from 'lucide-react'
import {cn} from '@/lib/utils'
type CheckboxProps=Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'children'>&{children?:ReactNode;indeterminate?:boolean}
export function Checkbox({children,className,indeterminate=false,disabled,checked,...props}:CheckboxProps){
 const input=useRef<HTMLInputElement>(null)
 useEffect(()=>{if(input.current)input.current.indeterminate=indeterminate},[indeterminate])
 return <label className={cn('inline-flex min-h-11 min-w-11 shrink-0 items-center gap-3 rounded-xl text-sm text-secondary',disabled?'cursor-not-allowed opacity-50':'cursor-pointer',className)}>
  <span className="relative flex h-6 w-6 shrink-0">
   <input {...props} ref={input} type="checkbox" checked={checked} disabled={disabled} aria-checked={indeterminate?'mixed':checked}
    className="peer h-6 w-6 cursor-[inherit] appearance-none rounded-lg border-2 border-[var(--border-primary)] bg-[var(--bg-primary)] transition-colors checked:border-[var(--accent-primary)] checked:bg-[var(--accent-primary)] indeterminate:border-[var(--accent-primary)] indeterminate:bg-[var(--accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"/>
   {indeterminate?<Minus aria-hidden className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-[var(--text-inverse)]" strokeWidth={3}/>:<Check aria-hidden className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-[var(--text-inverse)] opacity-0 peer-checked:opacity-100" strokeWidth={3}/>}
  </span>
  {children&&<span className="min-w-0 whitespace-normal leading-5">{children}</span>}
 </label>
}