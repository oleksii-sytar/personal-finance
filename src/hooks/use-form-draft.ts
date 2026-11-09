'use client'
import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import {useWorkspaceContext} from '@/contexts/workspace-context'

type Fields=Record<string,string|boolean|number|null>
interface Envelope {version:1;values:Fields}
const memory=new Map<string,string>()
const PREFIX='forma:draft:v1:'
function compatible(value:unknown,initial:Fields):value is Fields {
 if(!value||typeof value!=='object'||Array.isArray(value))return false
 const fields=value as Fields
 return Object.keys(fields).length===Object.keys(initial).length&&Object.entries(initial).every(([key,v])=>Object.prototype.hasOwnProperty.call(fields,key)&&(v===null?fields[key]===null:typeof fields[key]===typeof v))
}
/** Session-only drafts, scoped to the signed-in member and household. No network writes. */
export function useFormDraft<T extends Fields>(name:string,values:T,initial:T,restore:(values:T)=>void,enabled=true){
 const {workspace,currentUser}=useWorkspaceContext()
 const key=enabled&&workspace?.id&&currentUser?.id?PREFIX+workspace.id+':'+currentUser.id+':'+name:null
 const serialized=JSON.stringify(values),initialSerialized=JSON.stringify(initial),dirty=serialized!==initialSerialized
 const latest=useRef({restore,initial,serialized,dirty,key});latest.current={restore,initial,serialized,dirty,key}
 const previousKey=useRef<string|null>(null),suppressed=useRef<string|null>(null)
 const [ready,setReady]=useState<string|null>(null),[restored,setRestored]=useState(false),[storageError,setStorageError]=useState(false)
 useEffect(()=>{
  setReady(null);setRestored(false);setStorageError(false);suppressed.current=null
  if(!key)return
  const {initial,restore}=latest.current
  let raw=memory.get(key)
  try{raw=raw||window.sessionStorage.getItem(key)||undefined}catch{setStorageError(true)}
  let saved:T|undefined
  if(raw)try{const envelope=JSON.parse(raw) as Envelope;if(envelope.version===1&&compatible(envelope.values,initial))saved=envelope.values as T}catch{/* Invalid local drafts never reach controlled fields. */}
  if(saved)restore(saved)
  else if(previousKey.current&&previousKey.current!==key)restore(initial)
  previousKey.current=key;setRestored(!!saved);setReady(key)
 },[key])
 useLayoutEffect(()=>{
  if(!key||ready!==key||suppressed.current===serialized)return
  if(!dirty){memory.delete(key);try{window.sessionStorage.removeItem(key)}catch{setStorageError(true)};return}
  const raw=JSON.stringify({version:1,values:JSON.parse(serialized) as Fields} satisfies Envelope)
  try{window.sessionStorage.setItem(key,raw);memory.delete(key);setStorageError(false)}catch{memory.set(key,raw);setStorageError(true)}
 },[key,ready,serialized,dirty]) // Persist before a subsequent navigation can unmount the form.
 useEffect(()=>{
  if(!storageError)return
  const beforeUnload=(event:BeforeUnloadEvent)=>{if(latest.current.dirty){event.preventDefault();event.returnValue=''}}
  window.addEventListener('beforeunload',beforeUnload)
  return()=>window.removeEventListener('beforeunload',beforeUnload)
 },[storageError])
 function clear(){
  // Bind cleanup to the submitted render and scope, not a later edit or signed-in member.
  suppressed.current=serialized
  const matches=(raw:string|null|undefined)=>{if(!raw)return true;try{return JSON.stringify((JSON.parse(raw) as Envelope).values)===serialized}catch{return false}}
  if(key){
   const fallback=memory.get(key),ownsFallback=!!fallback&&matches(fallback)
   if(ownsFallback)memory.delete(key)
   try{if(ownsFallback||matches(window.sessionStorage.getItem(key)))window.sessionStorage.removeItem(key)}catch{/* Clear only the matching memory copy when storage is blocked. */}
  }
  setRestored(false)
 }
 function discard(){clear();latest.current.restore(latest.current.initial)}
 function close(callback:()=>void){if(storageError&&latest.current.dirty&&!window.confirm('Чернетку не вдалося зберегти у вкладці. Закрити форму й залишити її лише до перезавантаження сторінки?'))return;callback()}
 return {clear,discard,close,restored,storageError,hasDraft:!!key&&ready===key&&dirty}
}
