import {NextResponse} from 'next/server'
import {loadHistoricalRates} from '@/lib/money/historical-rates'
import type {CurrencyCode} from '@/types/domain'
export async function GET(request:Request){
 const q=new URL(request.url).searchParams,from=q.get('from')||'',to=q.get('to')||'',codes=(q.get('codes')||'').split(',').filter(Boolean)
 if(codes.length>5)return NextResponse.json({error:'Забагато валют'},{status:400})
 try{return NextResponse.json({rates:await loadHistoricalRates(from,to,codes as CurrencyCode[]),source:'НБУ',from,to},{headers:{'Cache-Control':'public, s-maxage=86400'}})}catch(error){return NextResponse.json({error:(error as Error).message},{status:503})}
}