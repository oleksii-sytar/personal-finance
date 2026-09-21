import type {FinancialModelData,Account,HistoryCoverage,ForecastSnapshot,PositionSnapshot} from '@/types/domain'
const camel=<T,>(v:Record<string,unknown>):T=>Object.fromEntries(Object.entries(v).map(([k,x])=>[k.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase()),x])) as T
export function decodeFinancialModel(raw:Record<string,any>):FinancialModelData {
 return {coverage:(raw.coverage||[]).map((r:Record<string,unknown>)=>camel<HistoryCoverage>(r)),positions:(raw.positions||[]).map((r:Record<string,any>)=>({...camel<PositionSnapshot>(r),accounts:(r.accounts||[]).map((a:Record<string,unknown>)=>camel<Account>(a))})),forecasts:(raw.forecasts||[]).map((r:Record<string,unknown>)=>camel<ForecastSnapshot>(r))}
}
export const EMPTY_FINANCIAL_MODEL:FinancialModelData={coverage:[],positions:[],forecasts:[]}