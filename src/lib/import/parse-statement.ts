import {parseMoney} from '@/lib/money/decimal'
import {hasVisibleText,labelKey} from '@/lib/integrity/text'
export interface ColumnMapping { date:number; description:number; amount:number }
export interface ParsedRow { date:string;description:string;amount:number;occurredAt?:string|null;valid:boolean;raw:string[];error?:string }

/** Count separators outside quoted header fields. */
export function detectDelimiter(line:string):string {
 const candidates=[';',',','\t','|'], counts=new Map(candidates.map(x=>[x,0]));let quoted=false
 for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){i++;continue}quoted=!quoted}else if(!quoted){if(c==='\r'||c==='\n')break;if(counts.has(c))counts.set(c,counts.get(c)!+1)}}
 return candidates.reduce((a,b)=>counts.get(b)!>counts.get(a)!?b:a,',')
}
/** RFC-style quoted records, including embedded newlines. Structural errors block the complete import. */
export function parseDelimited(text:string):{headers:string[];rows:string[][];delimiter:string;errors:string[]} {
 const input=text.replace(/^\uFEFF/,'');const delimiter=detectDelimiter(input),errors:string[]=[],records:string[][]=[]
 if(input.length>5*1024*1024)return {headers:[],rows:[],delimiter,errors:['Максимальний розмір CSV: 5 МБ']}
 let row:string[]=[],field='',quoted=false,closed=false
 const endField=()=>{row.push(field.trim());field='';closed=false}
 const endRow=()=>{endField();if(row.some(x=>x.length))records.push(row);row=[]}
 for(let i=0;i<input.length;i++){
  const c=input[i]
  if(quoted){if(c==='"'){if(input[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c;continue}
  if(c===delimiter){endField();continue}
  if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;endRow();continue}
  if(c==='"'){if(!field.trim()&&!closed){field='';quoted=true}else errors.push('Некоректні лапки у CSV');continue}
  if(closed&&!/\s/.test(c))errors.push('Зайві символи після закритих лапок CSV')
  field+=c
 }
 if(quoted)errors.push('У CSV є незакриті лапки')
 if(field.length||row.length)endRow()
 const headers=records.shift()||[],seen=new Set<string>()
 for(const h of headers){const key=labelKey(h);if(!hasVisibleText(h))errors.push('Кожна колонка повинна мати видиму назву');if(seen.has(key))errors.push('Повторна назва колонки: '+h);seen.add(key)}
 records.forEach((r,i)=>{if(r.length!==headers.length)errors.push('Рядок '+(i+2)+': кількість колонок не відповідає заголовку')})
 return {headers,rows:records,delimiter,errors:[...new Set(errors)]}
}
export const parseAmount=(raw:string,currency?:string):number|null=>parseMoney(raw,{symbols:true,currency})

function bankDate(raw:string):{date:string;occurredAt:string|null}|null {
 const s=raw.trim(),m=s.match(/^(?:(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})|(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}))(?:(?:T|\s)(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})?)?$/)
 if(!m)return null
 const year=Number(m[1]||m[6]),month=Number(m[2]||m[5]),day=Number(m[3]||m[4]),d=new Date(0)
 d.setUTCFullYear(year,month-1,day);d.setUTCHours(0,0,0,0)
 if(year<1||year>9999||d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return null
 if(m[7]&&(Number(m[7])>23||Number(m[8])>59||Number(m[9]||0)>59))return null
 if(m[11]&&m[11]!=='Z'){const [h,n]=m[11].slice(1).split(':').map(Number);if(h>14||n>59||(h===14&&n!==0))return null}
 const date=String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')
 return {date,occurredAt:m[7]?date+'T'+m[7]+':'+m[8]+':'+(m[9]||'00')+(m[10]||'')+(m[11]||''):null}
}
export const normalizeDate=(raw:string):string|null=>bankDate(raw)?.date||null
const DATE_KEYS=['date','дата','time','час'],AMOUNT_KEYS=['amount','сума','сумма','total','sum'],DESC_KEYS=['descr','опис','призначен','narrative','merchant','details','коментар','контрагент','name','деталі']
export function guessColumns(headers:string[]):ColumnMapping {
 const find=(keys:string[])=>headers.findIndex(h=>keys.some(k=>h.toLowerCase().includes(k)))
 return {date:find(DATE_KEYS)<0?0:find(DATE_KEYS),amount:find(AMOUNT_KEYS)<0?Math.max(0,headers.length-1):find(AMOUNT_KEYS),description:find(DESC_KEYS)<0?Math.min(1,headers.length-1):find(DESC_KEYS)}
}
export function toParsedRows(rows:string[][],mapping:ColumnMapping,currency?:string):ParsedRow[]{
 return rows.map(raw=>{
  const indices=Object.values(mapping),mappingValid=indices.every(i=>Number.isInteger(i)&&i>=0&&i<raw.length)&&new Set(indices).size===3
  const date=bankDate(raw[mapping.date]||''),amount=parseAmount(raw[mapping.amount]||'',currency),description=(raw[mapping.description]||'').trim()
  const error=!mappingValid?'Дата, опис і сума повинні використовувати різні колонки':!date?'Некоректна дата або час':amount===null||amount===0?'Введіть ненульову суму до 1 трлн, не більше двох десяткових знаків':description.length>7800?'Опис виписки має містити до 7800 символів':description&&!hasVisibleText(description)?'Опис не може складатися з невидимих символів':undefined
  return {date:date?.date||'',occurredAt:date?.occurredAt||null,description:description||'Імпортована операція',amount:amount??0,valid:!error,raw,error}
 })
}
