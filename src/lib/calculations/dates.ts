/** Business dates are Kyiv calendar dates, not UTC instants or browser time zones. */
export const localDay=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)
export const dayNumber=(s:string)=>Date.parse(s+'T00:00:00Z')/86400000
export const dayString=(n:number)=>new Date(n*86400000).toISOString().slice(0,10)
export const addDays=(s:string,n:number)=>dayString(dayNumber(s)+n)
export const monthEnd=(month:string)=>{const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0,12)).toISOString().slice(0,10)}
