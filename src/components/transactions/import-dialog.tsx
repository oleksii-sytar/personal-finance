'use client'
import {Dialog} from '@/components/ui/dialog'
import {ImportWorkflow} from './import-workflow'
export function ImportDialog({open,onClose,onDone}:{open:boolean;onClose:()=>void;onDone:(id:string)=>void}){return <Dialog open={open} onClose={onClose} title="Імпорт виписки"><ImportWorkflow onDone={onDone}/></Dialog>}