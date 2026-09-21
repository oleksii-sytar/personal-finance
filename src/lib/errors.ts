/**
 * Safe, actionable messages for UI boundaries. Do not expose SQL, table names,
 * tokens or server stack traces. Domain validation messages remain intact.
 */
export function errorMessage(error:unknown):string {
 const record=error&&typeof error==='object'?error as {message?:unknown;code?:unknown;status?:unknown}:null
 const message=typeof error==='string'?error:typeof record?.message==='string'?record.message:''
 const code=String(record?.code??record?.status??'')
 if(/failed to fetch|fetch failed|network|load failed|timed? ?out|timeout|aborted|ERR_BLOCKED_BY_CLIENT/i.test(message)||code==='408'||code==='504')
  return 'Не вдалося отримати відповідь сервера. Перевірте з’єднання. Перед повтором перевірте, чи зміни вже збереглися.'
 if(code==='401'||code==='PGRST301'||/jwt.*(expired|invalid)|refresh token|not authenticated/i.test(message))
  return 'Сесію входу завершено. Увійдіть у Forma знову та повторіть дію.'
 if(code==='42501'||/permission denied|row.level security/i.test(message))
  return /permission denied for (table|schema|function|sequence)/i.test(message)
   ? 'Збереження заблоковане налаштуваннями доступу сервісу. Це не нестача грошей. Повідомте про цю помилку.'
   : 'Для цієї дії бракує прав у сім’ї. Перевірте свій обліковий запис або зверніться до власника сім’ї.'
 if(code==='23505'||/duplicate key|unique constraint/i.test(message))
  return 'Такий запис уже існує. Перевірте список перед повторним додаванням.'
 if(code==='23503'||/foreign key constraint/i.test(message))
  return 'Дію блокують пов’язані дані. Перевірте вибраний рахунок і категорію; використаний запис може бути недоступний для видалення.'
 if(code==='429'||/too many requests|rate limit/i.test(message))
  return 'Забагато запитів за короткий час. Зачекайте трохи та повторіть дію.'
 if(code==='40001'||code==='409'||/concurrent|serialization|застаріл|вже змінено|змінився.*оновіть/i.test(message))
  return 'Ці дані вже змінилися на іншому пристрої. Відкрийте запис заново й повторіть потрібну зміну.'
 if(code==='23514'||code==='22003'||/numeric.*range|check constraint/i.test(message))
  return 'Дані не пройшли перевірку. Перевірте суму, валюту, дату та рахунки.'
 if(/^[45][0-9]{2}$/.test(code)||/^PGRST/.test(code)||/^42/.test(code)||/syntax error|column .*does not exist|relation .*does not exist|schema cache|stack trace|^TypeError|^Error:/i.test(message))
  return 'Сервіс не зміг обробити запит. Спробуйте пізніше; якщо помилка повториться, повідомте про неї.'
 if(message&&/[а-яіїєґ]/i.test(message))return message.trim().slice(0,800)
 return 'Не вдалося виконати дію. Перевірте, чи зміни вже збереглися. Якщо помилка повториться, повідомте про неї.'
}