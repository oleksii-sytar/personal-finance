'use client'
import {useEffect,useState} from 'react'

/** The visible area excludes the mobile keyboard and browser chrome. */
export function useVisualViewport(enabled=true){
 const [viewport,setViewport]=useState<{height:number;top:number}>()
 useEffect(()=>{
  if(!enabled)return
  const visible=window.visualViewport
  const update=()=>setViewport({height:visible?.height||window.innerHeight,top:visible?.offsetTop||0})
  update()
  visible?.addEventListener('resize',update)
  visible?.addEventListener('scroll',update)
  window.addEventListener('resize',update)
  return()=>{visible?.removeEventListener('resize',update);visible?.removeEventListener('scroll',update);window.removeEventListener('resize',update)}
 },[enabled])
 return viewport
}