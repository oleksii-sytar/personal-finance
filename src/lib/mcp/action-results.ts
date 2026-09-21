type Action = {status?:string;result?:Record<string,any>;expires_at?:string;[key:string]:any}
export function actionLabel(action:Action):string {
 if(action.status==='needs_resolution')return 'AI має розібрати збіг';
 if(action.status==='rejected')return 'Скасовано';
 if(action.status==='completed'){
  if(action.result?.status==='duplicate_skipped')return 'Дубль пропущено';
  if(action.result?.applied===false)return 'Без змін';
  return 'Виконано';
 }
 if(action.status==='pending')return 'Старий запит: не виконано';
 if(action.expires_at&&new Date(action.expires_at).getTime()<Date.now())return 'Термін запиту минув';
 return 'Ще не виконано';
}
export function actionResponse(action:Action){
 const base={...action,requires_confirmation:false};
 if(action.status==='completed')return {...base,applied:action.result?.applied!==false,message:action.result?.status==='duplicate_skipped'?'Операцію не додано вдруге. Повернуто наявний запис.':action.result?.applied===false?'Нових змін немає. Перевірте кількість пропущених дублів у результаті.':'Дію виконано.'};
 if(action.status==='needs_resolution')return {...base,applied:false,message:'Дію не виконано: знайдено можливий дубль або дані змінилися. Агент має перевірити candidates та передати обґрунтоване duplicate_resolution з актуальним candidate_version і новим request_id. Підтвердження у Forma не потрібне.'};
 if(action.status==='pending')return {...base,applied:false,message:'Це старий невиконаний запит. Не відкривайте посилання підтвердження. Перевірте актуальні дані й надішліть лише потрібну зараз дію з новим request_id; застарілий запит можна скасувати через cancel_request.'};
 if(action.status==='rejected')return {...base,applied:false,message:'Запит скасовано. Не відновлюйте його без актуального доручення користувача.'};
 return {...base,applied:false};
}