-- Data integrity: strict minor units, immutable ledger boundaries, atomic imports and relational guards.
-- Existing invalid records intentionally abort this migration rather than being silently changed.

-- Every change is local-tested before this script is packaged as a migration.
-- No existing amounts, descriptions or historical links are guessed or rewritten.
CREATE OR REPLACE FUNCTION public.finance_label_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE SET search_path='' AS $$
 SELECT lower(btrim(regexp_replace(regexp_replace(normalize(value,NFKC), '[­͏؜᠎​-‏‪-‮⁠-⁯︀-️﻿]', '', 'g'), '[[:space:]  ]+', ' ', 'g')))
$$;
REVOKE ALL ON FUNCTION public.finance_label_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_label_key(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.finance_money_valid(value numeric, positive boolean DEFAULT false) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path='' AS $$
 SELECT value IS NULL OR (abs(value)<1000000000000 AND value=round(value,2) AND (NOT positive OR value>0))
$$;
REVOKE ALL ON FUNCTION public.finance_money_valid(numeric,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finance_money_valid(numeric,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION finance_private.assert_money_fields(value jsonb, fields text[]) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE field text; token text;
BEGIN
 FOREACH field IN ARRAY fields LOOP
  token:=value->>field;
  IF token IS NOT NULL AND (token !~ '^[+-]?[0-9]+([.][0-9]{1,2})?$' OR NOT public.finance_money_valid(token::numeric)) THEN
   RAISE SQLSTATE 'PT422' USING MESSAGE='Некоректна сума: '||field||'. Не більше двох десяткових знаків і менше 1 трлн.';
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION finance_private.assert_money_fields(jsonb,text[]) FROM PUBLIC,anon,authenticated;

-- Unconstrained numeric plus explicit checks rejects 0.001 rather than silently rounding it on assignment.
DROP TRIGGER finance_position_after ON public.finance_accounts;
DO $$DECLARE tab text;col text;cols text[];BEGIN
 FOREACH tab IN ARRAY ARRAY['finance_accounts','finance_transactions','finance_loan_installments','finance_loans','finance_category_rules'] LOOP
  cols:=CASE tab
   WHEN 'finance_accounts' THEN ARRAY['opening_balance','current_balance','balance_anchor_amount','principal','credit_limit']
   WHEN 'finance_transactions' THEN ARRAY['amount','counter_amount','original_amount','loan_principal']
   WHEN 'finance_loan_installments' THEN ARRAY['principal','interest','fees','insurance','other','payment_total','principal_balance_after']
   WHEN 'finance_loans' THEN ARRAY['payoff_quote','card_minimum','card_grace_amount','card_planned_amount']
   ELSE ARRAY['min_amount','max_amount'] END;
  FOREACH col IN ARRAY cols LOOP
   EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE numeric USING %I::numeric',tab,col,col);
   EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK(public.finance_money_valid(%I))',tab,tab||'_'||col||'_exact',col);
  END LOOP;
 END LOOP;
END $$;
CREATE TRIGGER finance_position_after AFTER INSERT OR UPDATE OF current_balance,archived_at,is_savings,owner_user_id,is_shared,credit_limit ON public.finance_accounts FOR EACH ROW EXECUTE FUNCTION finance_private.capture_position_after();
ALTER TABLE public.finance_accounts ADD CONSTRAINT finance_cash_nonnegative CHECK(type<>'cash' OR (opening_balance>=0 AND current_balance>=0 AND balance_anchor_amount>=0));
ALTER TABLE public.finance_loan_installments ADD CONSTRAINT finance_complete_schedule_sum CHECK(
 interest IS NULL OR fees IS NULL OR insurance IS NULL OR other IS NULL OR principal+interest+fees+insurance+other=payment_total);
ALTER TABLE public.finance_accounts ADD CONSTRAINT finance_account_visible_name CHECK(length(public.finance_label_key(name))>0);
ALTER TABLE public.finance_categories ADD CONSTRAINT finance_category_visible_name CHECK(length(public.finance_label_key(name))>0);
ALTER TABLE public.finance_transactions ADD CONSTRAINT finance_transaction_visible_description CHECK(length(public.finance_label_key(description))>0);
ALTER TABLE public.finance_category_rules ADD CONSTRAINT finance_rule_visible_name CHECK(length(public.finance_label_key(name))>0);
CREATE UNIQUE INDEX finance_category_identity ON public.finance_categories(workspace_id,type,public.finance_label_key(name));
CREATE UNIQUE INDEX finance_account_identity ON public.finance_accounts(workspace_id,type,currency,is_shared,coalesce(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid),public.finance_label_key(name)) WHERE archived_at IS NULL;

ALTER TABLE public.finance_transactions ADD COLUMN source_description text CHECK(length(source_description)<=8000);
ALTER TABLE public.finance_transactions ADD COLUMN bank_reference text CHECK(length(btrim(bank_reference)) BETWEEN 1 AND 200);
ALTER TABLE public.finance_transactions ADD COLUMN counter_bank_reference text CHECK(length(btrim(counter_bank_reference)) BETWEEN 1 AND 200);
ALTER TABLE public.finance_import_batches ADD COLUMN input_hash text;
CREATE UNIQUE INDEX finance_source_bank_reference ON public.finance_transactions(workspace_id,account_id,bank_reference) WHERE bank_reference IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX finance_destination_bank_reference ON public.finance_transactions(workspace_id,counter_account_id,counter_bank_reference) WHERE counter_bank_reference IS NOT NULL AND deleted_at IS NULL;

-- A private trigger is privileged only to serialize a family's writes and inspect related rows.
-- It cannot be called by clients. Existing RLS and existing role checks remain authoritative.
CREATE OR REPLACE FUNCTION finance_private.integrity_before_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.finance_accounts; b public.finance_accounts;c public.finance_categories; token text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.finance_members WHERE workspace_id=NEW.workspace_id AND user_id=auth.uid()) THEN
  RAISE SQLSTATE '42501' USING MESSAGE='Потрібно увійти до цієї сім’ї';
 END IF;
 PERFORM 1 FROM public.finance_workspaces WHERE id=NEW.workspace_id FOR UPDATE;
 IF TG_TABLE_NAME IN ('finance_accounts','finance_categories','finance_category_rules') THEN
  IF length(public.finance_label_key(NEW.name))=0 THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Укажіть видиму назву';END IF;
 END IF;
 IF TG_TABLE_NAME='finance_accounts' THEN
  IF TG_OP='UPDATE' THEN
   IF NEW.type<>OLD.type OR NEW.currency<>OLD.currency OR NEW.workspace_id<>OLD.workspace_id OR NEW.created_by<>OLD.created_by THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Тип, валюту та сім’ю створеного рахунку змінювати не можна';END IF;
  ELSE
   IF NEW.created_by<>auth.uid() THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Автор рахунку має відповідати поточному користувачу';END IF;
   NEW.ledger_version:=0;
  END IF;
  IF NEW.type='savings' THEN NEW.is_savings:=true;END IF;
  IF NEW.is_shared AND NEW.owner_user_id IS NOT NULL THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Спільний рахунок не може мати одного особистого власника';END IF;
  IF NEW.type='cash' AND (NEW.opening_balance<0 OR NEW.current_balance<0 OR NEW.balance_anchor_amount<0) THEN
   RAISE SQLSTATE 'PT422' USING MESSAGE='Готівковий залишок не може бути від’ємним. Перевірте суму й рахунок.';
  END IF;
 ELSIF TG_TABLE_NAME='finance_categories' THEN
  IF TG_OP='UPDATE' THEN
  IF NEW.type<>OLD.type THEN
  IF EXISTS(SELECT 1 FROM public.finance_transactions t WHERE t.workspace_id=NEW.workspace_id AND t.category_id=NEW.id AND t.kind<>NEW.type)
    OR EXISTS(SELECT 1 FROM public.finance_category_rules r WHERE r.workspace_id=NEW.workspace_id AND r.category_id=NEW.id AND r.kind IS NOT NULL AND r.kind<>NEW.type) THEN
   RAISE SQLSTATE 'PT422' USING MESSAGE='Тип використаної категорії не можна змінити: перевірте пов’язані операції та правила.';
  END IF;
  END IF;
  END IF;
 ELSIF TG_TABLE_NAME='finance_category_rules' THEN
  SELECT * INTO c FROM public.finance_categories WHERE workspace_id=NEW.workspace_id AND id=NEW.category_id;
  IF c.id IS NULL OR (NEW.kind IS NOT NULL AND NEW.kind<>c.type) THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Тип категорії має відповідати типу операцій правила';END IF;
  NEW.kind:=coalesce(NEW.kind,c.type);
  IF NOT EXISTS(SELECT 1 FROM regexp_split_to_table(NEW.description_contains,'[,;|]') AS word WHERE length(public.finance_label_key(word))>0) THEN
   RAISE SQLSTATE 'PT422' USING MESSAGE='Додайте хоча б одне видиме ключове слово';END IF;
  IF NEW.account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.finance_accounts WHERE workspace_id=NEW.workspace_id AND id=NEW.account_id AND archived_at IS NULL) THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Оберіть доступний рахунок цієї сім’ї';END IF;
 ELSIF TG_TABLE_NAME='finance_loan_installments' THEN
  IF NOT EXISTS(SELECT 1 FROM public.finance_loan_imports WHERE id=NEW.import_id AND workspace_id=NEW.workspace_id AND account_id=NEW.account_id) THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Графік належить іншому кредиту';END IF;
  IF NEW.interest IS NOT NULL AND NEW.fees IS NOT NULL AND NEW.insurance IS NOT NULL AND NEW.other IS NOT NULL AND NEW.principal+NEW.interest+NEW.fees+NEW.insurance+NEW.other<>NEW.payment_total THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Платіж не дорівнює сумі всіх указаних складових';END IF;
 ELSIF TG_TABLE_NAME='finance_loans' THEN
  IF NEW.payment_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.finance_accounts WHERE workspace_id=NEW.workspace_id AND id=NEW.payment_account_id AND id<>NEW.account_id AND archived_at IS NULL AND type NOT IN ('bank_loan','microloan','mortgage','personal_debt') AND currency=(SELECT currency FROM public.finance_accounts WHERE id=NEW.account_id AND workspace_id=NEW.workspace_id)) THEN
   RAISE SQLSTATE 'PT422' USING MESSAGE='Оберіть платіжний рахунок у валюті кредиту';END IF;
 ELSIF TG_TABLE_NAME='finance_transactions' THEN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW;END IF;
  IF TG_OP='INSERT' THEN NEW.created_at:=clock_timestamp();END IF;
  IF TG_OP='INSERT' AND NEW.created_by<>auth.uid() THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Автор операції має відповідати поточному користувачу';END IF;
  NEW.bank_reference:=coalesce(nullif(btrim(NEW.bank_reference),''),CASE WHEN NEW.import_key LIKE 'bank:%' THEN nullif(btrim(substr(NEW.import_key,6)),'') END);
  NEW.counter_bank_reference:=coalesce(nullif(btrim(NEW.counter_bank_reference),''),CASE WHEN NEW.counter_import_key LIKE 'bank:%' THEN nullif(btrim(substr(NEW.counter_import_key,6)),'') END);
  IF length(public.finance_label_key(NEW.description))=0 THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Додайте видимий опис операції';END IF;
  SELECT * INTO a FROM public.finance_accounts WHERE id=NEW.account_id AND workspace_id=NEW.workspace_id;
  IF NEW.loan_account_id IS NOT NULL AND NEW.kind<>'expense' THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Платіж некарткового кредиту має бути витратою';END IF;
  IF NEW.kind='transfer' THEN
   SELECT * INTO b FROM public.finance_accounts WHERE id=NEW.counter_account_id AND workspace_id=NEW.workspace_id;
   IF b.type IN ('bank_loan','microloan','mortgage','personal_debt') THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Погашення некарткового кредиту запишіть витратою, вказавши кредит окремо.';END IF;
   IF b.currency=a.currency AND NEW.counter_amount IS NOT NULL AND NEW.counter_amount<>NEW.amount THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Суми переказу в одній валюті повинні збігатися';END IF;
  ELSIF NEW.counter_bank_reference IS NOT NULL THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Другий банківський ідентифікатор можливий лише у переказі';END IF;
  IF NEW.occurred_at IS NOT NULL AND (NEW.occurred_at !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9]([.][0-9]{1,6})?)?(Z|[+-]((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?$' OR left(NEW.occurred_at,10)<>NEW.transaction_date::text) THEN
   RAISE SQLSTATE 'PT422' USING MESSAGE='Час операції має бути коректним і відповідати її даті';END IF;
  IF NEW.bank_reference IS NOT NULL AND EXISTS(SELECT 1 FROM public.finance_transactions t WHERE t.workspace_id=NEW.workspace_id AND t.id<>NEW.id AND t.deleted_at IS NULL AND ((t.account_id=NEW.account_id AND (t.bank_reference=NEW.bank_reference OR t.import_key='bank:'||NEW.bank_reference)) OR (t.counter_account_id=NEW.account_id AND (t.counter_bank_reference=NEW.bank_reference OR t.counter_import_key='bank:'||NEW.bank_reference)))) THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Цей банківський ідентифікатор уже належить операції рахунку';END IF;
  IF NEW.counter_bank_reference IS NOT NULL AND EXISTS(SELECT 1 FROM public.finance_transactions t WHERE t.workspace_id=NEW.workspace_id AND t.id<>NEW.id AND t.deleted_at IS NULL AND ((t.account_id=NEW.counter_account_id AND (t.bank_reference=NEW.counter_bank_reference OR t.import_key='bank:'||NEW.counter_bank_reference)) OR (t.counter_account_id=NEW.counter_account_id AND (t.counter_bank_reference=NEW.counter_bank_reference OR t.counter_import_key='bank:'||NEW.counter_bank_reference)))) THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Цей банківський ідентифікатор уже належить операції рахунку';END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION finance_private.integrity_before_write() FROM PUBLIC,anon,authenticated;
DO $$DECLARE tab text;BEGIN
 FOREACH tab IN ARRAY ARRAY['finance_accounts','finance_categories','finance_category_rules','finance_loan_installments','finance_loans','finance_transactions'] LOOP
  EXECUTE format('CREATE TRIGGER finance_00_integrity_before BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION finance_private.integrity_before_write()',tab);
 END LOOP;
END $$;

ALTER TABLE public.finance_accounts ADD CONSTRAINT finance_shared_owner_valid CHECK(NOT is_shared OR owner_user_id IS NULL);
ALTER TABLE public.finance_accounts ADD CONSTRAINT finance_account_interest_valid CHECK(interest_rate IS NULL OR (interest_rate>=0 AND interest_rate<=1000));
ALTER TABLE public.finance_accounts ADD CONSTRAINT finance_manual_debt_signed CHECK(type NOT IN ('bank_loan','mortgage','microloan','personal_debt') OR (opening_balance<=0 AND current_balance<=0 AND balance_anchor_amount<=0));
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE FUNCTION public.finance_import_statement(p_account uuid, p_rows jsonb, p_filename text, p_request_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare w uuid;a public.finance_accounts;r jsonb;n integer;kept integer:=0;b public.finance_import_batches;t public.finance_transactions;before_row jsonb;matched uuid;seen uuid[]:='{}';imported uuid[]:='{}';key text;delta numeric; reqhash text; ref text; refs text[]:='{}'; existing_ref public.finance_transactions;
begin
 select workspace_id into w from public.finance_members where user_id=auth.uid() and role in ('owner','manager');if w is null then raise exception 'Імпорт доступний власнику або менеджеру';end if;
 perform 1 from public.finance_workspaces where id=w for update;
 select * into a from public.finance_accounts where id=p_account and workspace_id=w and archived_at is null;if a.id is null then raise exception 'Рахунок недоступний';end if;
 if p_request_id is null or p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Некоректний імпорт';end if;
 n:=jsonb_array_length(p_rows);if n<1 or n>5000 then raise exception 'Виписка має містити від 1 до 5000 операцій';end if;
 reqhash:=md5(jsonb_build_object('account',p_account,'rows',p_rows,'file',p_filename)::text);
 select * into b from public.finance_import_batches where id=p_request_id;
 if b.id is not null then if b.workspace_id<>w or b.created_by<>auth.uid() or b.account_id<>p_account then raise exception 'Ідентифікатор імпорту зайнятий';end if;if b.input_hash is distinct from reqhash then raise sqlstate 'PT409' using message='Вміст цього запиту змінився. Перевірте історію імпорту перед новою спробою.';end if;return(select coalesce(jsonb_agg(to_jsonb(bank_row)),'[]')from public.finance_transactions bank_row where workspace_id=w and (import_batch_id=b.id or counter_import_batch_id=b.id));end if;
 insert into public.finance_import_batches(id,workspace_id,account_id,file_name,input_hash)values(p_request_id,w,p_account,left(coalesce(nullif(btrim(p_filename),''),'Вставлений CSV'),200),reqhash);
 for r in select value from jsonb_array_elements(p_rows)loop
  if r->>'kind' not in ('income','expense') then raise exception 'Непідтримуваний тип виписки';end if;
  if nullif(r->>'import_anchor_at','') is null or (r->>'import_anchor_at')::timestamptz<>a.balance_anchor_at then raise exception 'Залишок було звірено. Оновіть попередній перегляд';end if;
  key:=nullif(r->>'import_key','');if key is null or length(key)>1500 then raise exception 'Некоректний ідентифікатор рядка';end if;
  perform finance_private.assert_money_fields(r,array['amount']);
  if r->>'amount' is null or (r->>'amount')::numeric<=0 or r->>'transaction_date' is null or r->>'transaction_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise sqlstate 'PT422' using message='Перевірте дату й ненульову суму рядка';end if;
  if r->>'currency' is not null and r->>'currency'<>a.currency then raise sqlstate 'PT422' using message='Валюта виписки не відповідає рахунку';end if;
  if r->>'description' is null or length(public.finance_label_key(r->>'description'))=0 or length(r->>'description')>8000 or length(r->>'source_description')>8000 or length(r->>'notes')>8000 then raise sqlstate 'PT422' using message='Перевірте видимий опис і примітки: не більше 8000 символів';end if;
  ref:=nullif(btrim(r->>'bank_reference'),'');
  if ref is null and key like 'bank:%' then
   if key like '%|occurrence:%' or key like '%|separate:%' then raise sqlstate 'PT422' using message='Повторний банківський ідентифікатор. Оновіть попередній перегляд.';end if;
   ref:=substr(key,6);
  end if;
  if ref is not null then
   if length(ref)>200 or length(public.finance_label_key(ref))=0 or ref=any(refs) then raise sqlstate 'PT422' using message='Банківський ідентифікатор порожній, задовгий або повторюється у виписці';end if;
   refs:=array_append(refs,ref);key:='bank:'||ref;
   select * into existing_ref from public.finance_transactions bank_tx where bank_tx.workspace_id=w and bank_tx.deleted_at is null and ((bank_tx.account_id=p_account and (bank_tx.bank_reference=ref or bank_tx.import_key=key)) or (bank_tx.counter_account_id=p_account and (bank_tx.counter_bank_reference=ref or bank_tx.counter_import_key=key))) limit 1;
   if existing_ref.id is not null then
    if existing_ref.transaction_date=(r->>'transaction_date')::date and (case when existing_ref.account_id=p_account then existing_ref.amount else coalesce(existing_ref.counter_amount,existing_ref.amount) end)=(r->>'amount')::numeric and (case when existing_ref.kind='transfer' then case when existing_ref.account_id=p_account then 'expense' else 'income' end else existing_ref.kind end)=r->>'kind' then continue;
    else raise sqlstate 'PT409' using message='Банківський ідентифікатор уже має іншу дату або суму. Перевірте наявну операцію.';end if;
   end if;
  end if;
  if exists(select 1 from public.finance_transactions where workspace_id=w and deleted_at is null and counter_account_id=p_account and counter_import_key=key) then continue;end if;
  matched:=nullif(r->>'matched_transaction_id','')::uuid;
  if matched is not null then
   if matched=any(seen)then raise exception 'Один ручний запис не можна зіставити двічі';end if;seen:=array_append(seen,matched);
   select * into t from public.finance_transactions where id=matched and workspace_id=w and deleted_at is null and status='completed' and ((account_id=p_account and kind=r->>'kind') or (kind='transfer' and ((account_id=p_account and r->>'kind'='expense') or (counter_account_id=p_account and r->>'kind'='income'))));
   if t.kind='transfer' then
    if nullif(r->>'match_updated_at','') is null or t.updated_at<>(r->>'match_updated_at')::timestamptz or abs(t.transaction_date-(r->>'transaction_date')::date)>2 or (case when t.account_id=p_account then t.amount else t.counter_amount end)<>(r->>'amount')::numeric then raise exception 'Переказ можна зіставити лише за точною сумою та актуальним записом';end if;
    if (t.account_id=p_account and t.import_key is not null) or (t.counter_account_id=p_account and t.counter_import_key is not null) then raise exception 'Цей бік переказу вже зіставлено з випискою';end if;
    before_row:=to_jsonb(t);
    update public.finance_transactions set import_key=case when account_id=p_account then key else import_key end,import_batch_id=case when account_id=p_account then p_request_id else import_batch_id end,counter_import_key=case when counter_account_id=p_account then key else counter_import_key end,counter_import_batch_id=case when counter_account_id=p_account then p_request_id else counter_import_batch_id end,bank_reference=case when account_id=p_account then ref else bank_reference end,counter_bank_reference=case when counter_account_id=p_account then ref else counter_bank_reference end,source_description=coalesce(r->>'source_description',r->>'description') where id=matched returning * into t;
    insert into public.finance_resolution_history(workspace_id,action,transaction_ids,before_rows,after_rows)values(w,'statement_match',array[t.id],jsonb_build_array(before_row),jsonb_build_array(to_jsonb(t)));
    kept:=kept+1;continue;
   end if;
   if t.id is null or t.import_key is not null then raise exception 'Ручний запис уже зіставлено або він недоступний';end if;
   delta:=abs(t.amount-(r->>'amount')::numeric);
   if t.loan_account_id is not null and (delta<>0 or t.transaction_date<>(r->>'transaction_date')::date)then raise exception 'Платіж кредиту можна зіставити лише за точною датою та сумою, щоб зберегти розбивку';end if;
   if abs(t.transaction_date-(r->>'transaction_date')::date)>2 or delta>1 or (delta>0 and t.amount<>trunc(t.amount))then raise exception 'Ці операції не відповідають критеріям збігу';end if;
   if nullif(r->>'match_updated_at','') is null or t.updated_at<>(r->>'match_updated_at')::timestamptz then raise exception 'Ручну операцію змінено. Перевірте збіг ще раз';end if;
   before_row:=to_jsonb(t);
   update public.finance_transactions set amount=(r->>'amount')::numeric,description=left(regexp_replace(btrim(r->>'description'),'[[:space:]]+',' ','g'),120),source_description=coalesce(r->>'source_description',r->>'description'),bank_reference=ref,transaction_date=(r->>'transaction_date')::date,occurred_at=r->>'occurred_at',import_key=key,import_batch_id=p_request_id,notes=notes where id=matched returning * into t;
   insert into public.finance_resolution_history(workspace_id,action,transaction_ids,before_rows,after_rows)values(w,'statement_match',array[t.id],jsonb_build_array(before_row),jsonb_build_array(to_jsonb(t)));
   kept:=kept+1;
  else
   insert into public.finance_transactions(workspace_id,account_id,kind,amount,currency,description,notes,transaction_date,status,occurred_at,import_key,import_batch_id,balance_treatment,import_anchor_at,source_description,bank_reference)
   values(w,p_account,r->>'kind',(r->>'amount')::numeric,a.currency,left(regexp_replace(btrim(r->>'description'),'[[:space:]]+',' ','g'),120),r->>'notes',(r->>'transaction_date')::date,'completed',r->>'occurred_at',key,p_request_id,coalesce(r->>'balance_treatment','auto'),(r->>'import_anchor_at')::timestamptz,coalesce(r->>'source_description',r->>'description'),ref) on conflict(workspace_id,account_id,import_key)where deleted_at is null do nothing;
   if found then kept:=kept+1;end if;
  end if;
 end loop;
 update public.finance_import_batches set row_count=kept,skipped_count=n-kept where id=p_request_id;
 return(select coalesce(jsonb_agg(to_jsonb(bank_row)order by transaction_date,id),'[]')from public.finance_transactions bank_row where workspace_id=w and (import_batch_id=p_request_id or counter_import_batch_id=p_request_id));
end $$;


CREATE OR REPLACE FUNCTION finance_private.import_loan_schedule(p_account uuid, p_rows jsonb, p_filename text, p_request uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w uuid;l public.finance_loans;r jsonb;i integer:=0;n integer;oldhash text;amount numeric;body numeric;cost numeric;identity text;seen text[]:='{}';
begin
 select workspace_id into w from public.finance_members where user_id=auth.uid() and role in ('owner','manager');if w is null then raise exception 'Імпорт графіка доступний власнику або менеджеру';end if;
 perform 1 from public.finance_workspaces where id=w for update;
 select * into l from public.finance_loans where account_id=p_account and workspace_id=w;
 if l.account_id is null then raise exception 'Спочатку налаштуйте кредит';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 or p_request is null then raise exception 'Графік має містити від 1 до 1000 платежів';end if;
 select content_hash into oldhash from public.finance_loan_imports where id=p_request and workspace_id=w and account_id=p_account;
 if oldhash is not null then if oldhash<>md5(p_rows::text) then raise exception 'Дані запиту змінилися';end if;return jsonb_array_length(p_rows);end if;
 insert into public.finance_loan_imports(id,workspace_id,account_id,file_name,content_hash)values(p_request,w,p_account,left(p_filename,200),md5(p_rows::text));
 update public.finance_loan_installments s set status='superseded' where s.workspace_id=w and s.account_id=p_account and s.status in ('scheduled','historical') and not exists(select 1 from public.finance_transactions t where t.loan_installment_id=s.id and t.deleted_at is null);
 for r in select value from jsonb_array_elements(p_rows) loop
  i:=i+1;
  perform finance_private.assert_money_fields(r,array['principal','payment_total','interest','fees','insurance','other','principal_balance_after']);
  if r->>'payment_date' is null or r->>'payment_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise sqlstate 'PT422' using message='Укажіть точну дату платежу у форматі YYYY-MM-DD';end if;
  identity:=jsonb_build_array(r->>'payment_date',r->>'principal',r->>'payment_total',r->>'interest',r->>'fees',r->>'insurance',r->>'other')::text;
  if identity=any(seen) then raise sqlstate 'PT422' using message='Повторний рядок кредитного графіка';end if;seen:=array_append(seen,identity);
  amount:=(r->>'payment_total')::numeric;body:=(r->>'principal')::numeric;
  cost:=coalesce((r->>'interest')::numeric,0)+coalesce((r->>'fees')::numeric,0)+coalesce((r->>'insurance')::numeric,0)+coalesce((r->>'other')::numeric,0);
  if amount is null or body is null or body<0 or amount<=0 or amount>=1e12 or body+cost>amount then raise exception 'Перевірте суму та складові рядка %',i;end if;
  if r->>'interest' is not null and r->>'fees' is not null and r->>'insurance' is not null and r->>'other' is not null and body+cost<>amount then raise sqlstate 'PT422' using message='Платіж не дорівнює сумі всіх указаних складових';end if;
  insert into public.finance_loan_installments(workspace_id,account_id,import_id,sequence,payment_date,principal,interest,fees,insurance,other,payment_total,principal_balance_after,source_page,status)
  values(w,p_account,p_request,i,(r->>'payment_date')::date,body,(r->>'interest')::numeric,(r->>'fees')::numeric,(r->>'insurance')::numeric,(r->>'other')::numeric,amount,(r->>'principal_balance_after')::numeric,left(r->>'source_page',100),case when (r->>'payment_date')::date<l.tracking_start_date or exists(select 1 from public.finance_transactions t join public.finance_loan_installments old on old.id=t.loan_installment_id where t.workspace_id=w and t.loan_account_id=p_account and t.deleted_at is null and old.payment_date=(r->>'payment_date')::date) then 'historical' else 'scheduled' end);
 end loop;return i;
end $function$;
CREATE OR REPLACE FUNCTION finance_private.save_loan(p_account uuid, p_values jsonb)
 RETURNS finance_loans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w uuid;a public.finance_accounts;r public.finance_loans;pay uuid;
begin
 select workspace_id into w from public.finance_members where user_id=auth.uid() and role in ('owner','manager');if w is null then raise exception 'Потрібні права власника або менеджера';end if;
 perform 1 from public.finance_workspaces where id=w for update;
 select * into a from public.finance_accounts where id=p_account and workspace_id=w and archived_at is null;
 if a.id is null or a.type not in ('bank_loan','microloan','mortgage','personal_debt','credit_card') then raise exception 'Кредит недоступний';end if;
 perform finance_private.assert_money_fields(p_values,array['payoff_quote','card_minimum','card_grace_amount','card_planned_amount']);
 if length(p_values->>'notes')>8000 then raise sqlstate 'PT422' using message='Примітки мають містити до 8000 символів';end if;
 pay:=nullif(p_values->>'payment_account_id','')::uuid;
 if pay is not null and not exists(select 1 from public.finance_accounts where id=pay and workspace_id=w and archived_at is null and id<>p_account and currency=a.currency) then raise exception 'Оберіть інший рахунок у валюті кредиту';end if;
 if (p_values->>'tracking_start_date')::date>(now() at time zone 'Europe/Kyiv')::date then raise exception 'Початок обліку не може бути в майбутньому';end if;
 insert into public.finance_loans(account_id,workspace_id,tracking_start_date,origination_date,payment_account_id,payoff_quote,payoff_quote_date,card_minimum,card_grace_amount,card_planned_amount,card_due_date,card_statement_date,notes,balance_basis,schedule_basis)
 values(p_account,w,coalesce((p_values->>'tracking_start_date')::date,a.balance_anchor_date),nullif(p_values->>'origination_date','')::date,pay,nullif(p_values->>'payoff_quote','')::numeric,nullif(p_values->>'payoff_quote_date','')::date,nullif(p_values->>'card_minimum','')::numeric,nullif(p_values->>'card_grace_amount','')::numeric,nullif(p_values->>'card_planned_amount','')::numeric,nullif(p_values->>'card_due_date','')::date,nullif(p_values->>'card_statement_date','')::date,left(p_values->>'notes',8000),coalesce(p_values->>'balance_basis','unknown'),coalesce(p_values->>'schedule_basis','unknown'))
 on conflict(account_id) do update set tracking_start_date=finance_loans.tracking_start_date,origination_date=excluded.origination_date,payment_account_id=excluded.payment_account_id,payoff_quote=excluded.payoff_quote,payoff_quote_date=excluded.payoff_quote_date,card_minimum=excluded.card_minimum,card_grace_amount=excluded.card_grace_amount,card_planned_amount=excluded.card_planned_amount,card_due_date=excluded.card_due_date,card_statement_date=excluded.card_statement_date,notes=excluded.notes,balance_basis=case when p_values ? 'balance_basis' then excluded.balance_basis else finance_loans.balance_basis end,schedule_basis=case when p_values ? 'schedule_basis' then excluded.schedule_basis else finance_loans.schedule_basis end,card_paid_transaction_id=case when finance_loans.card_statement_date is distinct from excluded.card_statement_date then null else finance_loans.card_paid_transaction_id end,updated_at=now() returning * into r;
 return r;
end $function$;

NOTIFY pgrst, 'reload schema';

-- Apply the NET effect once per account. Reversing an income before re-applying it
-- can temporarily overdraw cash even when only its description is edited.
CREATE OR REPLACE FUNCTION finance_private.transaction_balance_delta() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous public.finance_transactions;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Потрібно увійти';END IF;
 IF TG_OP='UPDATE' THEN previous:=OLD;END IF;
 UPDATE public.finance_accounts a SET current_balance=a.current_balance+d.delta,current_balance_updated_at=clock_timestamp()
 FROM (
  SELECT account_id,sum(delta) AS delta FROM (
   SELECT previous.account_id,CASE WHEN previous.kind='income' THEN -previous.amount ELSE previous.amount END AS delta
   FROM public.finance_accounts x WHERE x.id=previous.account_id AND previous.status='completed' AND previous.deleted_at IS NULL AND previous.balance_posted_at>x.balance_anchor_at
   UNION ALL
   SELECT previous.counter_account_id,-previous.counter_amount
   FROM public.finance_accounts x WHERE x.id=previous.counter_account_id AND previous.kind='transfer' AND previous.status='completed' AND previous.deleted_at IS NULL AND previous.counter_balance_posted_at>x.balance_anchor_at
   UNION ALL
   SELECT NEW.account_id,CASE WHEN NEW.kind='income' THEN NEW.amount ELSE -NEW.amount END
   FROM public.finance_accounts x WHERE x.id=NEW.account_id AND NEW.status='completed' AND NEW.deleted_at IS NULL AND NEW.balance_posted_at>x.balance_anchor_at
   UNION ALL
   SELECT NEW.counter_account_id,NEW.counter_amount
   FROM public.finance_accounts x WHERE x.id=NEW.counter_account_id AND NEW.kind='transfer' AND NEW.status='completed' AND NEW.deleted_at IS NULL AND NEW.counter_balance_posted_at>x.balance_anchor_at
  ) legs GROUP BY account_id
 ) d WHERE a.id=d.account_id AND d.delta<>0;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION finance_private.transaction_balance_delta() FROM PUBLIC,anon,authenticated;

-- Direct API edits must not bypass the reconciliation RPC, its version check and history.
REVOKE UPDATE ON public.finance_accounts FROM authenticated;
GRANT UPDATE(name,institution,counterparty,principal,interest_rate,credit_limit,due_date,archived_at,owner_user_id,is_shared,is_savings,is_default) ON public.finance_accounts TO authenticated;

-- Keep server and client tokenization consistent.
DO $$DECLARE definition text;BEGIN
 SELECT pg_get_functiondef('finance_private.transaction_before_write()'::regprocedure) INTO definition;
 EXECUTE replace(definition,'''[,;]''','''[,;|]''');
END $$;

CREATE OR REPLACE FUNCTION public.finance_integrity_audit()
RETURNS TABLE(entity text,id uuid,reason text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH family AS (SELECT workspace_id FROM public.finance_members WHERE user_id=auth.uid()),
 balances AS (
  SELECT a.id,a.current_balance,a.balance_anchor_amount+coalesce((
   SELECT sum(CASE WHEN t.account_id=a.id AND t.balance_posted_at>a.balance_anchor_at THEN CASE WHEN t.kind='income' THEN t.amount ELSE -t.amount END ELSE 0 END+
              CASE WHEN t.kind='transfer' AND t.counter_account_id=a.id AND t.counter_balance_posted_at>a.balance_anchor_at THEN t.counter_amount ELSE 0 END)
   FROM public.finance_transactions t WHERE t.workspace_id=a.workspace_id AND t.deleted_at IS NULL AND t.status='completed' AND (t.account_id=a.id OR t.counter_account_id=a.id)
  ),0) AS calculated
  FROM public.finance_accounts a JOIN family f USING(workspace_id) WHERE a.type NOT IN ('bank_loan','microloan','mortgage','personal_debt')
 )
 SELECT 'accounts',b.id,'Залишок не відповідає опорному залишку та проведеним операціям' FROM balances b WHERE b.current_balance<>b.calculated
 UNION ALL
 SELECT 'accounts',a.id,'Від’ємна готівка або невидима назва' FROM public.finance_accounts a JOIN family f USING(workspace_id) WHERE (a.type='cash' AND a.current_balance<0) OR length(public.finance_label_key(a.name))=0
 UNION ALL
 SELECT 'transactions',t.id,'Валюта операції або категорія не відповідає рахунку чи типу' FROM public.finance_transactions t JOIN family f USING(workspace_id)
 JOIN public.finance_accounts a ON a.id=t.account_id LEFT JOIN public.finance_categories c ON c.id=t.category_id
 WHERE t.deleted_at IS NULL AND (t.currency<>a.currency OR (c.id IS NOT NULL AND c.type<>t.kind))
 UNION ALL
 SELECT 'transactions',t.id,'Кредитний платіж або рядок графіка має неправильний зв’язок' FROM public.finance_transactions t JOIN family f USING(workspace_id)
 LEFT JOIN public.finance_accounts a ON a.id=t.loan_account_id LEFT JOIN public.finance_loan_installments s ON s.id=t.loan_installment_id
 WHERE t.deleted_at IS NULL AND ((t.loan_account_id IS NOT NULL AND (t.kind<>'expense' OR a.workspace_id<>t.workspace_id OR a.type NOT IN ('bank_loan','microloan','mortgage','personal_debt'))) OR (t.loan_installment_id IS NOT NULL AND (s.account_id IS DISTINCT FROM t.loan_account_id OR s.workspace_id<>t.workspace_id)))
 UNION ALL
 SELECT 'rules',r.id,'Тип правила не відповідає категорії або немає ключових слів' FROM public.finance_category_rules r JOIN family f USING(workspace_id)
 JOIN public.finance_categories c ON c.id=r.category_id WHERE (r.kind IS NOT NULL AND r.kind<>c.type) OR NOT EXISTS(SELECT 1 FROM regexp_split_to_table(r.description_contains,'[,;|]') word WHERE length(public.finance_label_key(word))>0)
 UNION ALL
 SELECT 'schedule',s.id,'Сума складових графіка не відповідає платежу' FROM public.finance_loan_installments s JOIN family f USING(workspace_id)
 WHERE s.status<>'superseded' AND s.interest IS NOT NULL AND s.fees IS NOT NULL AND s.insurance IS NOT NULL AND s.other IS NOT NULL AND s.principal+s.interest+s.fees+s.insurance+s.other<>s.payment_total
 UNION ALL
 SELECT 'categories',c.id,'Невидима назва категорії' FROM public.finance_categories c JOIN family f USING(workspace_id) WHERE length(public.finance_label_key(c.name))=0
$$;
REVOKE ALL ON FUNCTION public.finance_integrity_audit() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finance_integrity_audit() TO authenticated;
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE FUNCTION finance_private.validate_preferences()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or new.user_id<>auth.uid() or new.workspace_id<>old.workspace_id then raise exception 'Налаштування доступні лише їхньому власнику';end if;
 if new.default_account_id is not null and not exists(select 1 from public.finance_accounts where id=new.default_account_id and workspace_id=new.workspace_id and archived_at is null and type not in ('bank_loan','microloan','mortgage','personal_debt')) then raise exception 'Основний рахунок недоступний';end if;
 if cardinality(new.favorite_account_ids)>200 or exists(select 1 from unnest(new.favorite_account_ids) as f(account_id) where not exists(select 1 from public.finance_accounts a where a.id=f.account_id and a.workspace_id=new.workspace_id and a.archived_at is null and type not in ('bank_loan','microloan','mortgage','personal_debt'))) then raise exception 'Обраний рахунок недоступний';end if;
 return new;
end $function$;

NOTIFY pgrst,'reload schema';

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
 if p_operation='delete_category' then delete from public.finance_categories where workspace_id=w and finance_categories.id=apply_action.id;return jsonb_build_object('deleted',id);
 elsif p_operation='delete_rule' then delete from public.finance_category_rules where workspace_id=w and finance_category_rules.id=apply_action.id;return jsonb_build_object('deleted',id);end if;
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
