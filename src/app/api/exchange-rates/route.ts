import {NextResponse} from 'next/server'
export const revalidate=3600
export async function GET(){
  try{
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replace(/-/g,'')
    const response=await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?date='+date+'&json',{next:{revalidate:3600},signal:AbortSignal.timeout(10000)})
    if(!response.ok) throw new Error('NBU unavailable')
    const rows=await response.json() as Array<{cc:string;rate:number;exchangedate:string}>
    const rates:Record<string,number>={UAH:1}
    for(const code of ['USD','EUR','GBP','PLN']){
      const row=rows.find(r=>r.cc===code)
      if(!row || !Number.isFinite(row.rate) || row.rate<=0)throw new Error('Invalid NBU response')
      rates[code]=row.rate
    }
    return NextResponse.json({rates,date:rows.find(r=>r.cc==='USD')?.exchangedate,source:'НБУ'},{headers:{'Cache-Control':'public, s-maxage=3600, stale-while-revalidate=86400'}})
  }catch{return NextResponse.json({error:'Курси НБУ тимчасово недоступні'},{status:503})}
}