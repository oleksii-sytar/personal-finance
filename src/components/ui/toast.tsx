'use client'
import {createContext,useContext,useCallback,useState,useEffect,useRef,type ReactNode,type CSSProperties} from 'react'
import {createPortal} from 'react-dom'
import {CheckCircle2,AlertCircle,AlertTriangle,Info,X} from 'lucide-react'
import {errorMessage} from '@/lib/errors'
import {useVisualViewport} from '@/hooks/use-visual-viewport'

export type ToastType='success'|'error'|'warning'|'info'
export interface Toast{id:string;type:ToastType;title:string;description?:string;duration?:number}
interface ToastContextType{
 toasts:Toast[];addToast:(toast:Omit<Toast,'id'>)=>void;removeToast:(id:string)=>void;
 success:(title:string,description?:string)=>void;error:(title:string,error?:unknown)=>void;
 warning:(title:string,description?:string)=>void;info:(title:string,description?:string)=>void
}
const ToastContext=createContext<ToastContextType|undefined>(undefined)
export function useToast(){const context=useContext(ToastContext);if(!context)throw new Error('useToast must be used within a ToastProvider');return context}

export function ToastProvider({children}:{children:ReactNode}){
 const [toasts,setToasts]=useState<Toast[]>([])
 const removeToast=useCallback((id:string)=>setToasts(prev=>prev.filter(t=>t.id!==id)),[])
 const addToast=useCallback((input:Omit<Toast,'id'>)=>{
  const toast:Toast={...input,id:crypto.randomUUID(),duration:input.duration??(input.type==='error'?0:5000)}
  setToasts(prev=>[toast,...prev.filter(t=>t.type!==toast.type||t.title!==toast.title||t.description!==toast.description)].slice(0,3))
 },[])
 const success=useCallback((title:string,description?:string)=>addToast({type:'success',title,description}),[addToast])
 const error=useCallback((title:string,detail?:unknown)=>addToast({type:'error',title,description:detail!==undefined||/не вдалося|не збережено|не виконано|помилка/i.test(title)?errorMessage(detail):undefined,duration:0}),[addToast])
 const warning=useCallback((title:string,description?:string)=>addToast({type:'warning',title,description}),[addToast])
 const info=useCallback((title:string,description?:string)=>addToast({type:'info',title,description}),[addToast])
 return <ToastContext.Provider value={{toasts,addToast,removeToast,success,error,warning,info}}>{children}<ToastContainer toasts={toasts} onRemove={removeToast}/></ToastContext.Provider>
}
function ToastContainer({toasts,onRemove}:{toasts:Toast[];onRemove:(id:string)=>void}){
 const [host,setHost]=useState<HTMLElement|null>(null)
 const viewport=useVisualViewport(toasts.length>0)
 useEffect(()=>{
  const locate=()=>{const dialogs=document.querySelectorAll<HTMLElement>('[data-dialog-root]');setHost(dialogs[dialogs.length-1]||document.body)}
  locate();document.addEventListener('forma:dialog-change',locate)
  return()=>document.removeEventListener('forma:dialog-change',locate)
 },[])
 if(!host||!toasts.length)return null
 return createPortal(<div className="notification-viewport" data-toast-viewport role="region" aria-label="Сповіщення" style={{'--notification-top':(viewport?.top||0)+'px','--notification-height':(viewport?.height||window.innerHeight)+'px'} as CSSProperties}>
  {toasts.map(toast=><ToastItem key={toast.id} toast={toast} onRemove={onRemove}/>)}
 </div>,host)
}
const icons={success:CheckCircle2,error:AlertCircle,warning:AlertTriangle,info:Info}
function ToastItem({toast,onRemove}:{toast:Toast;onRemove:(id:string)=>void}){
 const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false)
 const remaining=useRef(toast.duration??5000)
 useEffect(()=>{
  if(!toast.duration||hovered||focused)return
  const started=Date.now(),timer=setTimeout(()=>onRemove(toast.id),remaining.current)
  return()=>{clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(Date.now()-started))}
 },[toast.id,toast.duration,onRemove,hovered,focused])
 const Icon=icons[toast.type]
 return <div data-toast-item className={'notification-item notification-item--'+toast.type} role={toast.type==='error'||toast.type==='warning'?'alert':'status'} aria-atomic="true"
  onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false)}}
  onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onRemove(toast.id)}}}>
  <Icon className="notification-icon" aria-hidden="true"/>
  <div className="notification-copy"><p className="notification-title">{toast.title}</p>{toast.description&&<p className="notification-description">{toast.description}</p>}</div>
  <button type="button" className="notification-close" onClick={()=>onRemove(toast.id)} aria-label="Закрити повідомлення"><X size={18} aria-hidden="true"/></button>
 </div>
}