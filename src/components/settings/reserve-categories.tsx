'use client'

import {useId,useState} from 'react'
import {useCategories,useUpdateCategory} from '@/hooks/use-finance'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {Checkbox} from '@/components/ui/checkbox'
import {useToast} from '@/components/ui/toast'
import {errorMessage} from '@/lib/errors'
import {SPENDING_HISTORY_DAYS} from '@/lib/calculations/history'

export function ReserveCategories(){return <SpendingCategories purpose="reserve"/>}
export function ForecastCategories(){return <SpendingCategories purpose="forecast"/>}
function SpendingCategories({purpose}:{purpose:'reserve'|'forecast'}){
 const forecast=purpose==='forecast',field=forecast?'includeInDailyForecast':'isEssential'
 const description=forecast?'Оберіть категорії для автоматичної оцінки щоденних витрат. Це спільний вибір для сім’ї.':'Оберіть категорії витрат для фінансового запасу. Це спільний вибір для сім’ї.'
 const {data:categories=[],isLoading,isError}=useCategories(),update=useUpdateCategory()
 const {can}=useWorkspaceContext(),toast=useToast(),descriptionId=useId()
 const [pendingId,setPendingId]=useState<string|null>(null)
 const [notice,setNotice]=useState<{error:boolean;text:string}|null>(null)
 const expenses=categories.filter(c=>c.type==='expense'),selected=expenses.filter(c=>c[field]!==false).length
 const editable=can('category.manage'),pending=pendingId!==null||update.isPending
 async function change(id:string,name:string,included:boolean){
  if(!editable||pending)return
  setPendingId(id);setNotice(null)
  try{
   await update.mutateAsync({id,patch:{[field]:included}})
   setNotice({error:false,text:name+': '+(forecast?(included?'враховано у щоденній оцінці.':'виключено зі щоденної оцінки.'):(included?'враховано у резерві.':'виключено з резерву.'))})
  }catch(error){
   const text=errorMessage(error)
   setNotice({error:true,text:'Не вдалося зберегти вибір. '+text})
   toast.error('Не вдалося зберегти вибір категорії',error)
  }finally{setPendingId(null)}
 }
 if(isLoading)return <p role="status" className="finance-caption">Завантажуємо категорії…</p>
 if(isError)return <p role="alert" className="text-sm text-[var(--accent-error)]">Не вдалося завантажити категорії. Оновіть сторінку.</p>
 return <div className="space-y-4">
  <p id={descriptionId} className="finance-caption">{description}</p>
  {forecast&&<p className="finance-caption">Історія: останні {SPENDING_HISTORY_DAYS} завершених днів, включно з днями без покупок. Якщо історії менше, використовуємо доступні дні.</p>}
  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
   <span className="rounded-full bg-[var(--ambient-glow)] px-3 py-1 font-medium text-accent">Обрано {selected} із {expenses.length}</span>
   <span className="text-secondary">{pending?'Зберігаємо…':'Зберігається одразу'}</span>
  </div>
  <fieldset aria-label={forecast?'Категорії щоденних витрат':'Категорії фінансового запасу'} aria-describedby={descriptionId} aria-busy={pending} className="min-w-0">
   <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
    {expenses.map(category=><Checkbox key={category.id} checked={category[field]!==false} disabled={!editable||pending}
     className={'w-full min-w-0 min-h-14 border px-3 py-3 transition-colors '+(category[field]!==false?'border-[var(--accent-primary)]/40 bg-[var(--ambient-glow)] text-primary':'border-[var(--border-primary)] bg-[var(--bg-primary)]')}
     onChange={event=>void change(category.id,category.name,event.target.checked)}
    ><span className="break-words">{category.name}</span></Checkbox>)}
   </div>
  </fieldset>
  {!expenses.length&&<p className="finance-caption">Категорій витрат ще немає.</p>}
  {notice&&<p role={notice.error?'alert':'status'} className={'text-sm '+(notice.error?'text-[var(--accent-error)]':'text-secondary')}>{notice.text}</p>}
  <p className="finance-caption">{forecast?'Впливає лише на щоденну оцінку. Статистика, резерв і створені плани не змінюються. Без категорії витрати враховуються; разові винятки залишаються чинними.':'Впливає лише на резерв. Загальна щоденна оцінка прогнозу та статистика не змінюються.'}</p>
  {!editable&&<p className="finance-caption">Змінювати цей вибір може власник або фінансовий менеджер сім’ї.</p>}
 </div>
}
