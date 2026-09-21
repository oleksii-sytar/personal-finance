'use client'
import {useEffect,useState} from 'react'
export function useOfflineManager(){
  const [isOnline,setOnline]=useState(true)
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
  return {isOnline,offlineManager:null}
}
export function OfflineManager(){
  const {isOnline}=useOfflineManager()
  if(isOnline) return null
  return <div role="status" className="fixed inset-x-0 top-0 z-[110] bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">Немає інтернету. Збереження та синхронізація недоступні до відновлення з’єднання. Не закривайте незбережену форму.</div>
}