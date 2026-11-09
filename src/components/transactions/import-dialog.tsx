'use client'
import {useRef} from 'react'
import {Dialog} from '@/components/ui/dialog'
import {ImportWorkflow} from './import-workflow'
export function ImportDialog({open,onClose,onDone}:{open:boolean;onClose:()=>void;onDone:(id:string)=>void}){
 const busy=useRef(false)
 return <Dialog open={open} onClose={()=>{if(!busy.current)onClose()}} title="Імпорт виписки"><ImportWorkflow onDone={onDone} onBusyChange={value=>{busy.current=value}}/></Dialog>
}
