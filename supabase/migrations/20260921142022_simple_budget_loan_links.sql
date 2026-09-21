
-- Household budget: links are descriptive, loan balances are manually confirmed.
-- Existing allocations remain in audit history; no bank allocation is inferred.
drop trigger if exists finance_loan_after on public.finance_transactions;
drop trigger if exists finance_00_loan_basis on public.finance_transactions;
drop trigger if exists finance_paid_loan_plan_after on public.finance_transactions;
drop trigger if exists finance_z_paid_plan_guard on public.finance_transactions;
drop function if exists finance_private.loan_balance_delta();
drop function if exists finance_private.stamp_loan_basis();
drop function if exists finance_private.fulfill_explicit_loan_plan_after();
drop function if exists finance_private.guard_paid_explicit_loan_plan();
drop function if exists finance_private.close_paid_loan_plans(uuid);
drop index if exists public.finance_explicit_loan_plan_lookup;

create or replace function finance_private.loan_before_write()
returns trigger language plpgsql security definer set search_path='' as $$
declare a public.finance_accounts; category uuid;
begin
 if auth.uid() is null then raise exception 'Потрібно увійти';end if;
 if new.kind<>'expense' then new.loan_account_id:=null;end if;
 if new.loan_account_id is null then
  new.loan_principal:=0;new.loan_installment_id:=null;new.loan_components:='{}'::jsonb;
  new.loan_basis:=null;new.loan_balance_posted_at:=null;new.loan_verified_at:=null;
  return new;
 end if;
 select * into a from public.finance_accounts where id=new.loan_account_id and workspace_id=new.workspace_id;
 if a.id is null or a.archived_at is not null or a.type not in('bank_loan','microloan','mortgage','personal_debt') or a.id=new.account_id then
  raise sqlstate 'PT422' using message='Оберіть доступний кредит або борг, відмінний від рахунку списання.';end if;
 if new.loan_installment_id is not null and not exists(select 1 from public.finance_loan_installments where id=new.loan_installment_id and account_id=a.id and workspace_id=new.workspace_id) then
  raise sqlstate 'PT422' using message='Рядок графіка належить іншому кредиту. Приберіть старий зв’язок.';end if;
 new.loan_principal:=0;new.loan_components:='{}'::jsonb;new.loan_basis:=null;new.loan_balance_posted_at:=null;
 new.accounting_class:='ordinary';
 if tg_op='INSERT' or new.loan_account_id is distinct from old.loan_account_id then new.loan_verified_at:=null;end if;
 if new.category_id is null then
  select id into category from public.finance_categories where workspace_id=new.workspace_id and type='expense' and name='Обслуговування кредитів' limit 1;
  if category is null then insert into public.finance_categories(workspace_id,name,type,color,icon)values(new.workspace_id,'Обслуговування кредитів','expense','#B45309','landmark')returning id into category;end if;
  new.category_id:=category;
 end if;
 return new;
end $$;

CREATE OR REPLACE FUNCTION finance_private.transaction_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.finance_accounts; b public.finance_accounts; c public.finance_categories; r public.finance_category_rules;
begin
 if (select auth.uid()) is null then raise exception 'Потрібно увійти'; end if;
 if tg_op='UPDATE' and old.status='planned' and new.status='completed' then
  if new.transaction_date=old.transaction_date then new.transaction_date:=(clock_timestamp() at time zone 'Europe/Kyiv')::date; end if;
  new.planned_date:=coalesce(old.planned_date,old.transaction_date); new.balance_treatment:='new_activity';
 end if;
 if new.status='completed' and new.transaction_date>(clock_timestamp() at time zone 'Europe/Kyiv')::date then raise exception 'Майбутня операція має бути запланованою'; end if;
 -- Confirmation metadata does not change a closed month's financial records.
 if tg_op='UPDATE' and (to_jsonb(new)-array['account_verified_at','counter_verified_at','loan_verified_at','updated_at','recurrence_suspended'])=(to_jsonb(old)-array['account_verified_at','counter_verified_at','loan_verified_at','updated_at','recurrence_suspended']) then new.updated_at:=clock_timestamp();return new;end if;
 -- One lock per family serializes ledger writes and month closing.
 perform 1 from public.finance_workspaces where id=new.workspace_id for update;
 if tg_op='UPDATE' and (new.workspace_id<>old.workspace_id or new.created_by<>old.created_by or new.id<>old.id) then raise exception 'Не можна змінювати власника операції'; end if;
 if exists(select 1 from public.finance_periods where workspace_id=new.workspace_id and month=date_trunc('month',new.transaction_date)::date) then raise exception 'Місяць закрито. Спочатку відкрийте його для змін.'; end if;
 if tg_op='UPDATE' and exists(select 1 from public.finance_periods where workspace_id=old.workspace_id and month=date_trunc('month',old.transaction_date)::date) then raise exception 'Місяць закрито. Спочатку відкрийте його для змін.'; end if;
 select * into strict a from public.finance_accounts where id=new.account_id and workspace_id=new.workspace_id;
 if a.archived_at is not null then raise exception 'Рахунок архівовано'; end if;
 if a.currency<>new.currency then raise exception 'Валюта операції має збігатися з валютою рахунку'; end if;
 if tg_op='INSERT' and new.import_anchor_at is not null and new.import_anchor_at<>a.balance_anchor_at then raise exception 'Залишок рахунку змінився. Оновіть сторінку та перегляньте імпорт ще раз.'; end if;
 if new.kind='transfer' then
  select * into strict b from public.finance_accounts where id=new.counter_account_id and workspace_id=new.workspace_id;
  if b.archived_at is not null then raise exception 'Рахунок одержувача архівовано'; end if;
  if b.type in('bank_loan','microloan','mortgage','personal_debt') and new.deleted_at is null then
   raise sqlstate 'PT422' using message='Оплату кредиту збережіть як витрату: оберіть кредит у полі «Кредит або борг». Повторного списання не потрібно.';
  end if;
  if b.currency=a.currency then new.counter_amount:=new.amount;
  elsif new.counter_amount is null then raise exception 'Укажіть фактичну отриману суму у валюті одержувача';
  end if;
  new.category_id:=null;
 else new.counter_amount:=null;
 end if;
 if new.category_id is null and new.kind<>'transfer' then
  select rules.* into r from public.finance_category_rules rules
  join public.finance_categories cats on cats.id=rules.category_id and cats.workspace_id=rules.workspace_id
  where rules.workspace_id=new.workspace_id and rules.is_active and cats.type=new.kind
   and (rules.kind is null or rules.kind=new.kind)
   and (rules.account_id is null or rules.account_id=new.account_id)
   and (rules.min_amount is null or new.amount>=rules.min_amount)
   and (rules.max_amount is null or new.amount<=rules.max_amount)
   and exists(select 1 from regexp_split_to_table(rules.description_contains,'[,;]') word where length(btrim(word))>0 and position(lower(btrim(word)) in lower(new.description))>0)
  order by rules.priority,rules.created_at limit 1;
  if r.id is not null then new.category_id:=r.category_id; new.cleared_status:='cleared'; end if;
 end if;
 if new.category_id is not null then
  select * into strict c from public.finance_categories where id=new.category_id and workspace_id=new.workspace_id;
  if c.type<>new.kind then raise exception 'Категорія не відповідає типу операції'; end if;
 end if;
 -- Posting markers are server-owned. Editing descriptions does not repost old history.
 if tg_op='INSERT' or new.account_id<>old.account_id or new.transaction_date<>old.transaction_date or (old.status='planned' and new.status='completed') then
  new.balance_posted_at:=case
   when new.transaction_date<a.balance_anchor_date then null
   when new.transaction_date>a.balance_anchor_date then clock_timestamp()
   when new.import_key is not null and new.balance_treatment<>'new_activity' then null
   when tg_op='UPDATE' and new.account_id=old.account_id and new.transaction_date=old.transaction_date and old.status='completed' and (old.balance_posted_at is null or old.balance_posted_at<=a.balance_anchor_at) then null
   when new.created_at<=a.balance_anchor_at and new.balance_treatment<>'new_activity' then null
   else clock_timestamp() end;
 end if;
 if new.kind='transfer' then
  if tg_op='INSERT' or old.kind<>'transfer' or new.counter_account_id is distinct from old.counter_account_id or new.transaction_date<>old.transaction_date or (old.status='planned' and new.status='completed') then
   new.counter_balance_posted_at:=case
    when new.transaction_date<b.balance_anchor_date then null
    when new.transaction_date>b.balance_anchor_date then clock_timestamp()
    when new.import_key is not null and new.balance_treatment<>'new_activity' then null
    when tg_op='UPDATE' and new.counter_account_id=old.counter_account_id and new.transaction_date=old.transaction_date and old.status='completed' and (old.counter_balance_posted_at is null or old.counter_balance_posted_at<=b.balance_anchor_at) then null
    when new.created_at<=b.balance_anchor_at and new.balance_treatment<>'new_activity' then null
    else clock_timestamp() end;
  end if;
 else new.counter_balance_posted_at:=null;
 end if;
 new.completed_at:=case when new.status='completed' then coalesce(new.completed_at,now()) else null end;
 if tg_op='INSERT' then
  new.account_verified_at:=null;new.counter_verified_at:=null;new.loan_verified_at:=null;
  new.review_required:=(new.kind<>'transfer' and new.category_id is null);
 elsif row(new.kind,new.account_id,new.counter_account_id,new.amount,new.counter_amount,new.currency,new.transaction_date,new.status,new.deleted_at) is distinct from row(old.kind,old.account_id,old.counter_account_id,old.amount,old.counter_amount,old.currency,old.transaction_date,old.status,old.deleted_at) then
  new.account_verified_at:=null;new.counter_verified_at:=null;new.loan_verified_at:=null;
  new.review_required:=true;new.cleared_status:='uncleared';
 elsif row(new.loan_account_id,new.loan_principal) is distinct from row(old.loan_account_id,old.loan_principal) then
  -- A loan link requests a fresh debt confirmation, not a second cash posting.
  new.loan_verified_at:=null;
 elsif new.category_id is distinct from old.category_id or new.cleared_status='cleared' and old.cleared_status<>'cleared' then
  new.review_required:=(new.kind<>'transfer' and new.category_id is null);
 end if;
 new.updated_at:=clock_timestamp();
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finance_edit_transaction(p_id uuid, p_patch jsonb, p_expected timestamp with time zone, p_confirm boolean DEFAULT false)
 RETURNS finance_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.finance_transactions;b public.finance_transactions;w uuid;role_name text;financial boolean;plan public.finance_transactions;
begin
 select workspace_id into w from public.finance_transactions where id=p_id;role_name:=finance_private.member_role(w);
 if coalesce(role_name,'') not in('owner','manager','member') then raise exception 'Немає доступу';end if;
 perform 1 from public.finance_workspaces where id=w for update;
 select * into strict a from public.finance_transactions where id=p_id and workspace_id=w for update;
 if role_name='member' and a.created_by<>auth.uid() then raise exception 'Можна змінювати лише власні операції';end if;
 if p_expected is null or a.updated_at<>p_expected then raise exception 'Цю операцію вже змінили. Закрийте форму й відкрийте актуальний запис.';end if;
 if p_patch is null or jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where k not in('kind','account_id','counter_account_id','counter_amount','category_id','amount','currency','description','notes','transaction_date','status','planned_date','deleted_at','cleared_status','original_amount','original_currency','planned_time','plan_exchange_mode','plan_exchange_rate','plan_exchange_date','loan_account_id','loan_installment_id','loan_principal','loan_components','loan_basis','review_required','accounting_class','forecast_behavior','flow_key','forecast_plan_id','forecast_plan_expected')) then raise exception 'Непідтримувані поля операції';end if;
 b:=jsonb_populate_record(a,p_patch);

 if b.loan_account_id is not null and b.kind='transfer' and b.counter_account_id=b.loan_account_id then
  b.kind:='expense';b.counter_account_id:=null;b.counter_amount:=null;
 end if;
 if b.kind<>'expense' then b.loan_account_id:=null;end if;
 if b.kind<>'transfer' then b.counter_account_id:=null;b.counter_amount:=null;end if;
 if b.loan_account_id is distinct from a.loan_account_id or b.loan_account_id is null then
  b.loan_principal:=0;b.loan_components:='{}'::jsonb;b.loan_basis:=null;
  if not(p_patch ? 'loan_installment_id') or b.loan_account_id is null then b.loan_installment_id:=null;end if;
 end if;
 if nullif(p_patch->>'forecast_plan_id','') is not null then
  select * into plan from public.finance_transactions where id=(p_patch->>'forecast_plan_id')::uuid and workspace_id=w and deleted_at is null for update;
  if plan.id is null or plan.id=a.id or plan.status<>'planned' or plan.kind<>'expense' or plan.recurrence_suspended or b.kind<>'expense' then
   raise sqlstate 'PT422' using message='Оберіть активний план витрати.';end if;
  if nullif(p_patch->>'forecast_plan_expected','') is null or plan.updated_at<>(p_patch->>'forecast_plan_expected')::timestamptz then
   raise sqlstate 'PT409' using message='План уже змінився. Відкрийте транзакцію ще раз.';end if;
  b.flow_key:=coalesce(nullif(plan.flow_key,''),'plan:'||plan.id::text);b.forecast_behavior:='scheduled';
  perform public.finance_edit_transaction(plan.id,jsonb_build_object('flow_key',b.flow_key,'forecast_behavior','scheduled'),plan.updated_at,false);
 end if;
 financial:=row(a.kind,a.account_id,a.counter_account_id,a.amount,a.counter_amount,a.currency,a.transaction_date,a.status,a.deleted_at) is distinct from row(b.kind,b.account_id,b.counter_account_id,b.amount,b.counter_amount,b.currency,b.transaction_date,b.status,b.deleted_at);
 if financial and a.status='completed' and not coalesce(p_confirm,false) then raise exception 'Підтвердьте фінансові зміни. Після них залишок потрібно буде перевірити знову.';end if;
 if a.kind<>'transfer' and b.kind='transfer' then raise exception 'Для перетворення на власний переказ скористайтеся кнопкою «Власний переказ»: вона перевіряє другий запис.';end if;
 update public.finance_transactions set accounting_class=b.accounting_class,forecast_behavior=b.forecast_behavior,flow_key=b.flow_key,loan_account_id=b.loan_account_id,loan_installment_id=b.loan_installment_id,loan_principal=b.loan_principal,loan_components=b.loan_components,loan_basis=b.loan_basis,kind=b.kind,account_id=b.account_id,counter_account_id=b.counter_account_id,counter_amount=b.counter_amount,category_id=b.category_id,amount=b.amount,currency=b.currency,description=b.description,notes=b.notes,original_amount=b.original_amount,original_currency=b.original_currency,planned_time=b.planned_time,plan_exchange_mode=b.plan_exchange_mode,plan_exchange_rate=b.plan_exchange_rate,plan_exchange_date=b.plan_exchange_date,transaction_date=b.transaction_date,status=b.status,planned_date=b.planned_date,deleted_at=b.deleted_at,cleared_status=case when b.cleared_status='reconciled' then 'cleared' else b.cleared_status end where id=a.id returning * into b;
 if p_patch ? 'review_required' then
   if p_patch->>'review_required' is distinct from 'false' then raise exception 'Непідтримуваний стан перевірки';end if;
   perform public.finance_review_transaction(b.id,b.updated_at);
   select * into strict b from public.finance_transactions where id=a.id;
  end if;
  insert into public.finance_resolution_history(workspace_id,action,transaction_ids,before_rows,after_rows) values(w,'edit',array[a.id],jsonb_build_array(to_jsonb(a)),jsonb_build_array(to_jsonb(b)));
 return b;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finance_save_recurring(p_values jsonb, p_request_id uuid, p_id uuid DEFAULT NULL::uuid, p_expected timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS finance_recurring
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.finance_accounts;r public.finance_recurring;oldr public.finance_recurring;s public.finance_transactions;
 w uuid;role_name text;v jsonb;h text;cached finance_private.recurring_requests;prior text;c public.finance_mcp_connections;
 today date:=(clock_timestamp() at time zone 'Europe/Kyiv')::date;
begin
 if auth.uid() is null or p_request_id is null or p_values is null or jsonb_typeof(p_values)<>'object' then raise exception 'Некоректний запит';end if;
 if exists(select 1 from jsonb_object_keys(p_values) k where k not in ('template','frequency','interval_count','start_date','end_date','is_active','source_transaction_id','source_expected_updated_at')) then raise exception 'Непідтримувані поля повторення';end if;
 if p_id is not null then select * into oldr from public.finance_recurring where id=p_id;w:=oldr.workspace_id;
 else select * into a from public.finance_accounts where id=(p_values->'template'->>'account_id')::uuid;w:=a.workspace_id;end if;
 role_name:=finance_private.member_role(w);
 if coalesce(role_name,'') not in ('owner','manager','member') then raise sqlstate '42501' using message='Немає доступу';end if;
 if auth.jwt() ? 'client_id' then c:=finance_private.mcp_connection(true);if c.workspace_id<>w then raise sqlstate '42501' using message='Інший сімейний простір';end if;end if;
 if p_id is not null and role_name='member' and oldr.created_by is distinct from auth.uid() then raise sqlstate '42501' using message='Можна змінювати лише власні повторення';end if;
 perform 1 from public.finance_workspaces where id=w for update;
 h:=encode(sha256(convert_to(jsonb_build_object('id',p_id,'expected',p_expected,'values',p_values)::text,'UTF8')),'hex');
 select * into cached from finance_private.recurring_requests where workspace_id=w and user_id=auth.uid() and request_id=p_request_id;
 if cached.request_id is not null then
  if cached.input_hash<>h then raise exception 'Ключ запиту вже використано для інших даних';end if;
  return jsonb_populate_record(null::public.finance_recurring,cached.result);
 end if;
 if p_id is not null then
  select * into strict oldr from public.finance_recurring where id=p_id and workspace_id=w for update;
  if p_expected is null or oldr.updated_at<>p_expected then raise exception 'Повторення вже змінено. Відкрийте актуальні налаштування.';end if;
  r:=oldr;
 else
  if (select count(*) from public.finance_recurring where workspace_id=w and created_by is not null)>=100 then raise exception 'Максимум 100 серій у сім’ї';end if;
  r.id:=gen_random_uuid();r.workspace_id:=w;r.created_by:=auth.uid();r.created_at:=clock_timestamp();r.interval_count:=1;r.is_active:=true;
 end if;
 r:=jsonb_populate_record(r,p_values-array['source_expected_updated_at']);
 if p_id is not null and r.source_transaction_id is distinct from oldr.source_transaction_id then raise exception 'Початкову операцію серії змінювати не можна';end if;
 v:=r.template;
 if v is null or jsonb_typeof(v)<>'object' or exists(select 1 from jsonb_object_keys(v) k where k not in ('account_id','category_id','transaction_type_id','kind','amount','currency','original_amount','original_currency','description','notes','plan_exchange_mode','plan_exchange_rate','plan_exchange_date','planned_time','accounting_class','forecast_behavior','flow_key','loan_account_id')) then raise exception 'Некоректний шаблон операції';end if;
 select * into a from public.finance_accounts where id=(v->>'account_id')::uuid and workspace_id=w and archived_at is null;
 if a.id is null or v->>'currency' is distinct from a.currency or coalesce(v->>'kind','') not in ('income','expense') then raise exception 'Оберіть рахунок, валюту та тип доходу або витрати';end if;
 if (v->>'amount') is null or not((v->>'amount')::numeric>0 and (v->>'amount')::numeric<1000000000000) or (v->>'amount')::numeric<>round((v->>'amount')::numeric,2) then raise exception 'Некоректна сума';end if;
 if char_length(btrim(coalesce(v->>'description',''))) not between 1 and 120 or char_length(coalesce(v->>'notes',''))>500 then raise exception 'Перевірте опис і примітки';end if;
 if nullif(v->>'category_id','') is not null and not exists(select 1 from public.finance_categories where id=(v->>'category_id')::uuid and workspace_id=w and type=v->>'kind') then raise exception 'Категорія не відповідає операції';end if;
 if nullif(v->>'loan_account_id','') is not null and (v->>'kind'<>'expense' or not exists(
  select 1 from public.finance_accounts where id=(v->>'loan_account_id')::uuid and workspace_id=w and archived_at is null and type in('bank_loan','microloan','mortgage','personal_debt')
 )) then raise exception 'Кредит для повторення недоступний';end if;
 if nullif(v->>'transaction_type_id','') is not null and not exists(select 1 from public.finance_transaction_types where id=(v->>'transaction_type_id')::uuid and workspace_id=w) then raise exception 'Тип операції недоступний';end if;
 if v->>'plan_exchange_mode' is not null then
  if v->>'plan_exchange_mode' not in ('nbu','manual') or coalesce(v->>'original_currency','') not in ('UAH','USD','EUR','GBP','PLN') or nullif(v->>'original_amount','') is null or not((v->>'original_amount')::numeric>0 and (v->>'original_amount')::numeric<1000000000000) or nullif(v->>'plan_exchange_rate','') is null or not((v->>'plan_exchange_rate')::numeric>0 and (v->>'plan_exchange_rate')::numeric<1000000) then raise exception 'Некоректна валюта або курс плану';end if;
 end if;
 if coalesce(v->>'accounting_class','ordinary') not in ('ordinary','principal') or coalesce(v->>'forecast_behavior','auto') not in ('auto','scheduled','one_off') or length(v->>'flow_key')>120 then raise exception 'Некоректні параметри обліку та прогнозу';end if;
 if nullif(v->>'planned_time','') is not null and v->>'planned_time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Некоректний час повторення';end if;
 if r.start_date is null or r.frequency is null or r.interval_count is null or r.interval_count not between 1 and 120 or r.frequency not in ('daily','weekly','monthly','yearly') then raise exception 'Укажіть початок і періодичність';end if;
 if (p_id is null or r.start_date is distinct from oldr.start_date) and r.start_date<today then raise exception 'Нове повторення починається сьогодні або пізніше';end if;
 if r.start_date>today+interval '5 years' or (r.end_date is not null and r.end_date<r.start_date) then raise exception 'Перевірте дати повторення';end if;
 if r.is_active is null then raise exception 'Укажіть стан повторення';end if;
 if p_id is null and r.source_transaction_id is not null then
  select * into s from public.finance_transactions where id=r.source_transaction_id and workspace_id=w and deleted_at is null for update;
  if s.id is null or s.kind='transfer' or (role_name='member' and s.created_by<>auth.uid()) then raise exception 'Початкова операція недоступна';end if;
  if nullif(p_values->>'source_expected_updated_at','') is null or s.updated_at<>(p_values->>'source_expected_updated_at')::timestamptz then raise exception 'Початкова операція змінилася. Відкрийте її ще раз.';end if;
  if s.recurring_transaction_id is not null or exists(select 1 from public.finance_recurring where workspace_id=w and source_transaction_id=s.id) then raise exception 'Для цієї операції вже існує повторення';end if;
 end if;
 r.updated_at:=clock_timestamp();r.generated_through:=null;r.next_due_date:=r.start_date;
 if p_id is null then
  insert into public.finance_recurring(id,workspace_id,template,frequency,interval_count,start_date,end_date,next_due_date,is_active,created_by,created_at,updated_at,source_transaction_id,generated_through)
  values(r.id,w,r.template,r.frequency,r.interval_count,r.start_date,r.end_date,r.next_due_date,r.is_active,r.created_by,r.created_at,r.updated_at,r.source_transaction_id,null);
 else
  update public.finance_recurring set template=r.template,frequency=r.frequency,interval_count=r.interval_count,start_date=r.start_date,end_date=r.end_date,is_active=r.is_active,updated_at=r.updated_at,generated_through=null where id=r.id;
 end if;
 if s.id is not null and s.status='planned' and s.transaction_date=r.start_date then
  prior:=coalesce(current_setting('finance.recurring_write',true),'');perform set_config('finance.recurring_write','on',true);
  update public.finance_transactions set recurring_transaction_id=r.id,recurrence_date=r.start_date,is_expected=true where id=s.id;
  perform set_config('finance.recurring_write',prior,true);
 end if;
 perform finance_private.materialize_recurring(r.id,true);
 select * into strict r from public.finance_recurring where id=r.id;
 insert into finance_private.recurring_requests(workspace_id,user_id,request_id,input_hash,result)values(w,auth.uid(),p_request_id,h,to_jsonb(r));
 return r;
end $function$;

CREATE OR REPLACE FUNCTION finance_private.materialize_recurring(p_id uuid, p_force boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.finance_recurring; t public.finance_transactions; a public.finance_accounts;
 today date:=(clock_timestamp() at time zone 'Europe/Kyiv')::date;
 horizon date:=((clock_timestamp() at time zone 'Europe/Kyiv')::date+interval '1 year')::date;
 first_day date;last_day date;due date;i integer:=0;added integer:=0;v jsonb;prior text;
begin
 select * into r from public.finance_recurring where id=p_id;
 if r.id is null or r.created_by is null then return 0;end if;
 if auth.uid() is null or finance_private.member_role(r.workspace_id) is null then raise sqlstate '42501' using message='Немає доступу до сім’ї';end if;
 if not p_force and (not r.is_active or r.generated_through>=horizon) then return 0;end if;
 perform 1 from public.finance_workspaces where id=r.workspace_id for update;
 select * into strict r from public.finance_recurring where id=p_id for update;
 if not p_force and (not r.is_active or r.generated_through>=horizon) then return 0;end if;
 prior:=coalesce(current_setting('finance.recurring_write',true),'');
 perform set_config('finance.recurring_write','on',true);
 if p_force then
  update public.finance_transactions set recurrence_suspended=true
  where recurring_transaction_id=r.id and workspace_id=r.workspace_id and status='planned'
    and transaction_date>=today and deleted_at is null and not recurrence_suspended;
 end if;
 if not r.is_active then
  update public.finance_recurring set generated_through=null where id=r.id;
  perform set_config('finance.recurring_write',prior,true);return 0;
 end if;
 v:=r.template;
 select * into a from public.finance_accounts where id=(v->>'account_id')::uuid and workspace_id=r.workspace_id;
 if a.id is null or a.archived_at is not null then
  perform set_config('finance.recurring_write',prior,true);return 0;
 end if;
 if a.currency<>v->>'currency' then raise exception 'Валюта рахунку змінилася. Оновіть повторення.';end if;
 first_day:=greatest(r.start_date,today,case when p_force then today else coalesce(r.generated_through+1,today)end);
 last_day:=least(horizon,coalesce(r.end_date,horizon));
 if r.frequency in ('daily','weekly') then
  i:=greatest(0,(first_day-r.start_date)/(r.interval_count*case when r.frequency='weekly' then 7 else 1 end));
 else
  i:=greatest(0,((extract(year from first_day)::int-extract(year from r.start_date)::int)*12+extract(month from first_day)::int-extract(month from r.start_date)::int)/(r.interval_count*case when r.frequency='yearly' then 12 else 1 end));
 end if;
 loop
  due:=finance_private.recurrence_date(r.start_date,r.frequency,r.interval_count,i);
  exit when due>last_day or i>20000;
  if due>=first_day then
   select * into t from public.finance_transactions where workspace_id=r.workspace_id and recurring_transaction_id=r.id and recurrence_date=due for update;
   if t.id is null then
    insert into public.finance_transactions(workspace_id,loan_account_id,accounting_class,forecast_behavior,flow_key,account_id,category_id,transaction_type_id,kind,amount,currency,original_amount,original_currency,description,notes,transaction_date,status,planned_date,planned_time,plan_exchange_mode,plan_exchange_rate,plan_exchange_date,is_expected,recurring_transaction_id,recurrence_date,created_by)
    values(r.workspace_id,nullif(v->>'loan_account_id','')::uuid,coalesce(v->>'accounting_class','ordinary'),coalesce(v->>'forecast_behavior','auto'),v->>'flow_key',a.id,nullif(v->>'category_id','')::uuid,nullif(v->>'transaction_type_id','')::uuid,v->>'kind',(v->>'amount')::numeric,a.currency,nullif(v->>'original_amount','')::numeric,nullif(v->>'original_currency',''),v->>'description',v->>'notes',due,'planned',due,nullif(v->>'planned_time',''),v->>'plan_exchange_mode',nullif(v->>'plan_exchange_rate','')::numeric,nullif(v->>'plan_exchange_date','')::date,true,r.id,due,r.created_by);
    added:=added+1;
   elsif p_force and t.status='planned' and t.deleted_at is null then
    if t.recurrence_override then
     update public.finance_transactions set recurrence_suspended=false where id=t.id;
    else
     update public.finance_transactions set loan_account_id=nullif(v->>'loan_account_id','')::uuid,accounting_class=coalesce(v->>'accounting_class','ordinary'),forecast_behavior=coalesce(v->>'forecast_behavior','auto'),flow_key=v->>'flow_key',account_id=a.id,category_id=nullif(v->>'category_id','')::uuid,transaction_type_id=nullif(v->>'transaction_type_id','')::uuid,kind=v->>'kind',amount=(v->>'amount')::numeric,currency=a.currency,original_amount=nullif(v->>'original_amount','')::numeric,original_currency=nullif(v->>'original_currency',''),description=v->>'description',notes=v->>'notes',transaction_date=due,planned_date=due,planned_time=nullif(v->>'planned_time',''),plan_exchange_mode=v->>'plan_exchange_mode',plan_exchange_rate=nullif(v->>'plan_exchange_rate','')::numeric,plan_exchange_date=nullif(v->>'plan_exchange_date','')::date,recurrence_suspended=false where id=t.id;
    end if;
   end if;
  end if;
  i:=i+1;
 end loop;
 update public.finance_recurring set generated_through=horizon,next_due_date=coalesce(
  (select min(transaction_date) from public.finance_transactions where recurring_transaction_id=r.id and workspace_id=r.workspace_id and status='planned' and deleted_at is null and not recurrence_suspended and transaction_date>=today),
  finance_private.recurrence_date(r.start_date,r.frequency,r.interval_count,i))
 where id=r.id;
 perform set_config('finance.recurring_write',prior,true);
 return added;
end $function$;

CREATE OR REPLACE FUNCTION finance_private.mcp_apply(p_operation text, p_payload jsonb, p_workspace uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
<<apply_action>>
declare p jsonb:=p_payload;w uuid:=p_workspace;r text;result jsonb;tab text;allowed text[];fields text;v jsonb;oldrow jsonb;id uuid;ids uuid[];versions jsonb;cnt integer;bad text;gate jsonb;entry jsonb;accepted jsonb;conflicts jsonb;skipped integer;target public.finance_mcp_requests;loan_account public.finance_accounts;
begin
 select role into r from public.finance_members where user_id=auth.uid() and workspace_id=w;
 if r is null or r='viewer' then raise sqlstate '42501' using message='No write access';end if;
 if r='member' and p_operation not in ('create_transaction','update_transaction','delete_transaction','restore_transaction','update_settings','cancel_request','save_recurring') then raise sqlstate '42501' using message='Manager permission required';end if;
 if p ? 'id' then id:=(p->>'id')::uuid;end if;
 if p_operation in ('update_transaction','delete_transaction','restore_transaction') and r='member' and not exists(select 1 from public.finance_transactions t where t.id=(p->>'id')::uuid and t.workspace_id=w and t.created_by=auth.uid()) then raise sqlstate '42501' using message='Only your own transactions may be edited';end if;
 if p_operation='cancel_request' then
  select req.* into target from public.finance_mcp_requests req where req.id=apply_action.id and req.user_id=auth.uid() and req.workspace_id=w and req.connection_id=(finance_private.mcp_connection(true)).id for update;
  if target.id is null then raise sqlstate '42501' using message='Request unavailable';end if;
  if target.status='completed' then raise exception 'Completed actions cannot be cancelled; use the appropriate undo operation';end if;
  update public.finance_mcp_requests req set status='rejected' where req.id=target.id;
  return jsonb_build_object('cancelled_request_id',target.id,'applied',true);
 elsif p_operation='save_recurring' then
  select to_jsonb(saved) into result from public.finance_save_recurring(p->'values',(p->>'recurring_request_id')::uuid,nullif(p->>'id','')::uuid,nullif(p->>'expected_updated_at','')::timestamptz)saved;return result;
 elsif p_operation='create_transaction' then
  tab:='finance_transactions';allowed:=array['account_id','counter_account_id','counter_amount','category_id','transaction_type_id','kind','amount','currency','original_amount','original_currency','description','notes','transaction_date','status','planned_date','occurred_at','balance_treatment','planned_time','plan_exchange_mode','plan_exchange_rate','plan_exchange_date','accounting_class','forecast_behavior','flow_key','loan_account_id','loan_installment_id'];v:=p->'values';
 elsif p_operation in ('update_transaction','delete_transaction','restore_transaction') then
  v:=case p_operation when 'delete_transaction' then jsonb_build_object('deleted_at',clock_timestamp()) when 'restore_transaction' then jsonb_build_object('deleted_at',null) else p->'values' end;
  select to_jsonb(t) into result from public.finance_edit_transaction(id,v,(p->>'expected_updated_at')::timestamptz,true)t;return result;
 elsif p_operation='review_transaction' then perform public.finance_review_transaction(id,(p->>'expected_updated_at')::timestamptz);return jsonb_build_object('id',id,'reviewed',true);
 elsif p_operation='classify_transaction' then perform public.finance_classify_safe(id,(p->>'category_id')::uuid,p->>'keyword',(p->>'expected_updated_at')::timestamptz);return jsonb_build_object('id',id,'classified',true);
 elsif p_operation in ('bulk_categorize','bulk_move','bulk_delete','bulk_restore') then
  select array_agg(value::uuid) into ids from jsonb_array_elements_text(p->'ids');
  cnt:=public.finance_bulk_safe(ids,replace(p_operation,'bulk_',''),nullif(p->>'account_id','')::uuid,nullif(p->>'category_id','')::uuid,p->'versions');return jsonb_build_object('changed',cnt);
 elsif p_operation='make_transfer' then
  id:=public.finance_make_transfer(id,(p->>'expected_updated_at')::timestamptz,(p->>'source_account_id')::uuid,(p->>'destination_account_id')::uuid,(p->>'source_amount')::numeric,(p->>'received_amount')::numeric,nullif(p->>'match_id','')::uuid,nullif(p->>'match_updated_at','')::timestamptz,coalesce((p->>'confirm_missing')::boolean,false));return jsonb_build_object('id',id);
 elsif p_operation='resolve_pair' then id:=public.finance_resolve_pair((p->>'keep_id')::uuid,(p->>'remove_id')::uuid,(p->>'is_transfer')::boolean,(p->>'keep_updated_at')::timestamptz,(p->>'remove_updated_at')::timestamptz);return jsonb_build_object('resolution_id',id);
 elsif p_operation='undo_resolution' then perform public.finance_undo_resolution(id);return jsonb_build_object('undone',id);
 elsif p_operation='confirm_balance' then
  select to_jsonb(t) into result from public.finance_confirm_balance((p->>'account_id')::uuid,p->>'value',(p->>'ledger_version')::bigint,(p->>'anchor_at')::timestamptz,true,p->>'note')t;return result;
 elsif p_operation='undo_balance' then perform public.finance_undo_balance(id);return jsonb_build_object('undone',id);
 elsif p_operation='import_statement' then
  accepted:='[]'::jsonb;conflicts:='[]'::jsonb;skipped:=coalesce((p->>'skipped_count')::integer,0);cnt:=0;
  if jsonb_typeof(p->'rows') is distinct from 'array' or jsonb_array_length(p->'rows')>5000 then raise exception 'Invalid statement rows';end if;
  for entry in select value from jsonb_array_elements(p->'rows')loop
   cnt:=cnt+1;gate:=finance_private.mcp_statement_check(w,(p->>'account_id')::uuid,entry);
   if gate->>'status'='needs_resolution' then conflicts:=conflicts||jsonb_build_array(gate||jsonb_build_object('row',coalesce((entry->>'source_row')::integer,cnt)));
   elsif gate->>'status'='duplicate_skipped' then skipped:=skipped+1;
   else
    if coalesce((gate->>'distinct_import_key')::boolean,false) then entry:=entry||jsonb_build_object('import_key',(entry->>'import_key')||'|separate:'||(p->>'import_request_id'));end if;
    accepted:=accepted||jsonb_build_array(entry);end if;
  end loop;
  if jsonb_array_length(conflicts)>0 then return jsonb_build_object('status','needs_resolution','applied',false,'reason','statement_duplicates','rows',conflicts,'message','Resolve these rows through MCP and resubmit with a new request_id. No browser approval is required.');end if;
  if jsonb_array_length(accepted)=0 then return jsonb_build_object('imported',0,'skipped',skipped,'applied',false);end if;
  result:=public.finance_import_statement((p->>'account_id')::uuid,accepted,p->>'file_name',(p->>'import_request_id')::uuid);
  return jsonb_build_object('import_id',p->>'import_request_id','imported',jsonb_array_length(result),'skipped',skipped+jsonb_array_length(accepted)-jsonb_array_length(result),'applied',jsonb_array_length(result)>0);
 elsif p_operation='cancel_import' then cnt:=public.finance_cancel_statement(id);return jsonb_build_object('changed',cnt);
 elsif p_operation='move_import' then
  select array_agg(t.id),jsonb_object_agg(t.id::text,t.updated_at) into ids,versions from public.finance_transactions t where t.workspace_id=w and (t.import_batch_id=apply_action.id or t.counter_import_batch_id=apply_action.id) and t.deleted_at is null;
  if ids is null then raise exception 'Імпорт не містить активних операцій';end if;
  if (select encode(sha256(convert_to(versions::text,'UTF8')),'hex')) is distinct from p->>'expected_version' then raise exception 'Імпорт змінився. Оновіть попередній перегляд';end if;
  cnt:=public.finance_bulk_safe(ids,'move',(p->>'account_id')::uuid,null,versions);return jsonb_build_object('changed',cnt);
 elsif p_operation='save_loan' then
  select to_jsonb(t) into oldrow from public.finance_loans t where t.account_id=(p->>'account_id')::uuid and t.workspace_id=w for update;
  if oldrow is not null and encode(sha256(convert_to(oldrow::text,'UTF8')),'hex') is distinct from p->>'expected_version' then raise exception 'Кредит змінився. Прочитайте актуальні налаштування';end if;
  v:=coalesce(oldrow,'{}'::jsonb)||(p->'values');select to_jsonb(t) into result from public.finance_save_loan((p->>'account_id')::uuid,v)t;return result;
 elsif p_operation='import_loan_schedule' then
  cnt:=public.finance_import_loan_schedule((p->>'account_id')::uuid,p->'rows',p->>'file_name',(p->>'import_request_id')::uuid);return jsonb_build_object('imported',cnt);
 elsif p_operation='pay_loan' then
  v:=p->'values';select ac.* into loan_account from public.finance_accounts ac where ac.id=(p->>'account_id')::uuid and ac.workspace_id=w;
  if loan_account.id is null then raise exception 'Loan unavailable';end if;
  if nullif(v->>'transaction_id','') is null then
   gate:=finance_private.mcp_duplicate_decision(w,jsonb_build_object('account_id',v->>'payment_account_id','transaction_date',v->>'date','kind',case when loan_account.type='credit_card' then 'transfer' else 'expense'end,'counter_account_id',case when loan_account.type='credit_card' then loan_account.id end,'counter_amount',v->'total','amount',v->'total','currency',loan_account.currency,'description','Loan payment','status','completed'),null,p->'duplicate_resolution');
   if gate->>'status'<>'clear' then return gate||jsonb_build_object('message','A payment may already exist. Link its transaction_id and exact expected_updated_at when linking the loan payment; do not create a second expense.');end if;
  else
   select to_jsonb(t)into oldrow from public.finance_transactions t where t.id=(v->>'transaction_id')::uuid and t.workspace_id=w and t.deleted_at is null;
   if oldrow is null or nullif(v->>'expected_updated_at','')is null or (oldrow->>'updated_at')::timestamptz<>(v->>'expected_updated_at')::timestamptz then raise exception 'Read the current payment and preserve expected_updated_at';end if;
  end if;
  id:=public.finance_pay_loan((p->>'account_id')::uuid,v);return jsonb_build_object('transaction_id',id);
 elsif p_operation='set_period' then perform public.finance_set_period((p->>'month')::date,(p->>'closed')::boolean);return jsonb_build_object('month',p->>'month','closed',p->'closed');
 elsif p_operation in ('create_account','update_account','archive_account') then
  tab:='finance_accounts';allowed:=array['name','type','currency','institution','counterparty','principal','interest_rate','due_date','credit_limit','owner_user_id','is_shared','is_savings'];
  if p_operation='create_account' then allowed:=allowed||array['opening_balance'];end if;
  v:=case when p_operation='archive_account' then jsonb_build_object('archived_at',clock_timestamp()) else p->'values' end;
  if p_operation='archive_account' then allowed:=array['archived_at'];end if;
 elsif p_operation in ('create_category','update_category','delete_category') then tab:='finance_categories';allowed:=array['name','type','color','icon','is_essential','include_in_daily_forecast'];v:=p->'values';
 elsif p_operation in ('create_rule','update_rule','delete_rule') then tab:='finance_category_rules';allowed:=array['name','category_id','description_contains','is_active','kind','min_amount','max_amount','account_id','priority'];v:=p->'values';
 elsif p_operation='update_settings' then tab:='finance_settings';allowed:=array['display_currency','safety_buffer_days','default_account_id','favorite_account_ids','import_reminder_enabled','import_reminder_weekday','import_reminder_dismissed'];v:=p->'values';
 else raise exception 'Unsupported operation';
 end if;
 if p_operation not like 'create_%' then
  execute format('select to_jsonb(t) from public.%I t where workspace_id=$1 and %I=$2 for update',tab,case when tab='finance_settings' then 'user_id' else 'id' end)into oldrow using w,case when tab='finance_settings' then auth.uid() else id end;
  if oldrow is null then raise exception 'Запис недоступний';end if;
  if encode(sha256(convert_to(oldrow::text,'UTF8')),'hex') is distinct from p->>'expected_version' then raise exception 'Запис змінився. Прочитайте актуальну версію';end if;
 end if;
 if p_operation like 'delete_%' then execute format('delete from public.%I where workspace_id=$1 and id=$2',tab)using w,id;return jsonb_build_object('deleted',id);end if;
 if jsonb_typeof(v)<>'object' or v='{}'::jsonb then raise exception 'Values must be a nonempty object';end if;
 select key into bad from jsonb_object_keys(v) key where not key=any(allowed) limit 1;if bad is not null then raise exception 'Unsupported field: %',bad;end if;
 if tab='finance_accounts' and p_operation<>'create_account' and (v ? 'type' or v ? 'currency') and exists(select 1 from public.finance_transactions tx where tx.workspace_id=w and (tx.account_id=apply_action.id or tx.counter_account_id=apply_action.id or tx.loan_account_id=apply_action.id)) then raise exception 'Не змінюйте тип або валюту рахунку з історією';end if;
 if tab='finance_category_rules' and not exists(select 1 from public.finance_categories cat where cat.id=coalesce(nullif(v->>'category_id','')::uuid,nullif(oldrow->>'category_id','')::uuid) and cat.workspace_id=w) then raise exception 'Категорія недоступна';end if;
 if tab='finance_category_rules' and nullif(v->>'account_id','') is not null and not exists(select 1 from public.finance_accounts ac where ac.id=(v->>'account_id')::uuid and ac.workspace_id=w) then raise exception 'Рахунок недоступний';end if;
 if p_operation like 'create_%' then
  if p_operation='create_transaction' then
   gate:=finance_private.mcp_duplicate_decision(w,v,p->>'bank_reference',p->'duplicate_resolution');
   if gate->>'status'<>'clear' then return gate;end if;
   if nullif(btrim(p->>'bank_reference'),'')is not null then v:=v||jsonb_build_object('import_key','bank:'||btrim(p->>'bank_reference'));end if;
  end if;
  v:=v||jsonb_build_object('workspace_id',w);select string_agg(format('%I',key),',') into fields from jsonb_object_keys(v)key;
  execute format('insert into public.%1$I(%2$s) select %2$s from jsonb_populate_record(null::public.%1$I,$1) returning to_jsonb(%1$I)',tab,fields)into result using v;
 else
  select string_agg(format('%1$I=x.%1$I',key),',')into fields from jsonb_object_keys(v)key;
  execute format('update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I,$1)x where t.workspace_id=$2 and t.%3$I=$3 returning to_jsonb(t)',tab,fields,case when tab='finance_settings' then 'user_id' else 'id' end)into result using v,w,case when tab='finance_settings' then auth.uid() else id end;
 end if;
 return result;
end $function$;

create or replace function finance_private.pay_loan(p_loan uuid,p_values jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.finance_accounts;t public.finance_transactions;s public.finance_loan_installments;
 w uuid;payment uuid;existing uuid;installment uuid;d date;total numeric;category uuid;before_row jsonb;role_name text;
begin
 select * into a from public.finance_accounts where id=p_loan and archived_at is null;
 w:=a.workspace_id;role_name:=finance_private.member_role(w);
 if auth.uid() is null or coalesce(role_name,'') not in('owner','manager') then raise sqlstate '42501' using message='Потрібні права власника або менеджера';end if;
 if a.type not in('bank_loan','microloan','mortgage','personal_debt','credit_card') then raise exception 'Кредит недоступний';end if;
 perform 1 from public.finance_workspaces where id=w for update;
 payment:=nullif(p_values->>'payment_account_id','')::uuid;existing:=nullif(p_values->>'transaction_id','')::uuid;
 installment:=nullif(p_values->>'installment_id','')::uuid;d:=nullif(p_values->>'date','')::date;total:=nullif(p_values->>'total','')::numeric;
 if d is null or d>(clock_timestamp() at time zone 'Europe/Kyiv')::date or total is null or not(total>0 and total<1e12) then raise exception 'Вкажіть фактичну дату та суму оплати';end if;
 if not exists(select 1 from public.finance_accounts where id=payment and workspace_id=w and archived_at is null and id<>p_loan and currency=a.currency and type not in('bank_loan','microloan','mortgage','personal_debt')) then raise exception 'Оберіть рахунок списання у валюті кредиту';end if;
 if installment is not null then
  select * into s from public.finance_loan_installments where id=installment and account_id=p_loan and workspace_id=w;
  if s.id is null then raise exception 'Рядок графіка недоступний';end if;
  select * into t from public.finance_transactions where workspace_id=w and loan_installment_id=installment and deleted_at is null for update;
  if t.id is not null and existing is null then
   if t.status='completed' then return t.id;end if;
   existing:=t.id;p_values:=p_values||jsonb_build_object('expected_updated_at',t.updated_at);
  elsif t.id is not null and t.id<>existing then raise sqlstate 'PT409' using message='Цей платіж уже має транзакцію. Відкрийте її замість нового списання.';end if;
 end if;
 if existing is not null then
  select * into t from public.finance_transactions where id=existing and workspace_id=w and deleted_at is null for update;
  if t.id is null or t.kind not in('expense','transfer') or t.loan_account_id is not null and t.loan_account_id<>p_loan then raise exception 'Транзакція недоступна для цього кредиту';end if;
  if t.kind='transfer' and t.counter_account_id<>p_loan then raise exception 'Оберіть витрату або переказ саме на цей кредит';end if;
  if nullif(p_values->>'expected_updated_at','') is null or t.updated_at<>(p_values->>'expected_updated_at')::timestamptz then raise sqlstate 'PT409' using message='Транзакцію вже змінили. Відкрийте актуальний запис.';end if;
 end if;
 if a.type='credit_card' then
  if existing is not null then
   if t.kind<>'transfer' then raise exception 'Погашення картки є переказом. Перетворіть наявний запис на власний переказ.';end if;
   select * into t from public.finance_edit_transaction(t.id,jsonb_build_object('account_id',payment,'amount',total,'counter_amount',total,'transaction_date',d,'status','completed'),t.updated_at,true);
  else
   insert into public.finance_transactions(workspace_id,account_id,counter_account_id,kind,amount,currency,description,transaction_date,status,balance_treatment)
    values(w,payment,p_loan,'transfer',total,a.currency,left('Погашення: '||a.name,120),d,'completed','new_activity')returning * into t;
  end if;
  update public.finance_loans set card_paid_transaction_id=t.id,updated_at=now() where account_id=p_loan;
  return t.id;
 end if;
 if existing is not null then
  select * into t from public.finance_edit_transaction(t.id,jsonb_build_object('kind','expense','counter_account_id',null,'counter_amount',null,'account_id',payment,'currency',a.currency,'amount',total,'transaction_date',d,'status','completed','loan_account_id',p_loan,'loan_installment_id',coalesce(installment,t.loan_installment_id),'review_required',false),t.updated_at,true);
 else
  insert into public.finance_transactions(workspace_id,account_id,kind,amount,currency,description,transaction_date,status,balance_treatment,loan_account_id,loan_installment_id)
   values(w,payment,'expense',total,a.currency,left('Платіж: '||a.name,120),d,'completed','new_activity',p_loan,installment)returning * into t;
  insert into public.finance_resolution_history(workspace_id,action,transaction_ids,before_rows,after_rows)
   values(w,'loan_payment',array[t.id],'[]'::jsonb,jsonb_build_array(to_jsonb(t)));
 end if;
 return t.id;
end $$;

-- Attach already explicitly created plans to their loan once.
-- No schedule row creates a new plan, payment, or forecast movement.
do $$
declare p record;prior text;before_row public.finance_transactions;after_row public.finance_transactions;
begin
 prior:=current_setting('request.jwt.claims',true);
 for p in select t.id,coalesce(t.created_by,(select user_id from public.finance_members where workspace_id=t.workspace_id and role='owner' limit 1)) as created_by,t.workspace_id,s.account_id,s.id as installment
  from public.finance_transactions t
  join public.finance_loan_installments s on t.import_key='explicit-loan-plans-2026:'||s.id::text and t.workspace_id=s.workspace_id
  where t.deleted_at is null and t.status='planned' and t.kind='expense' and t.loan_account_id is null
   and not exists(select 1 from public.finance_transactions other where other.workspace_id=t.workspace_id and other.loan_installment_id=s.id and other.deleted_at is null)
 loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p.created_by,'role','authenticated')::text,true);
  select * into before_row from public.finance_transactions where id=p.id for update;
  update public.finance_transactions set loan_account_id=p.account_id,loan_installment_id=p.installment where id=p.id returning * into after_row;
  insert into public.finance_resolution_history(workspace_id,action,transaction_ids,before_rows,after_rows)
   values(p.workspace_id,'edit',array[p.id],jsonb_build_array(to_jsonb(before_row)),jsonb_build_array(to_jsonb(after_row)));
 end loop;
 perform set_config('request.jwt.claims',coalesce(prior,''),true);
end $$;
