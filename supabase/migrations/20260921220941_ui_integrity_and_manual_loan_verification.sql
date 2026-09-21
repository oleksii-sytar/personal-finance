-- UI writes must be able to store the optional link, including NULL for ordinary transactions.
-- RLS, workspace validation and all server-owned balance fields remain unchanged.
grant insert (loan_account_id, loan_installment_id) on public.finance_transactions to authenticated;

-- A manual loan link is context, not a second bank movement to reconcile.
CREATE OR REPLACE FUNCTION public.finance_ledger_rows(p_filter jsonb, p_snapshot timestamp with time zone)
 RETURNS SETOF public.finance_transactions
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select t.* from public.finance_transactions t
 where t.workspace_id=(select workspace_id from public.finance_members where user_id=(select auth.uid()))
 and t.created_at<=p_snapshot
 and (t.status<>'completed' or t.transaction_date<=(statement_timestamp() at time zone 'Europe/Kyiv')::date)
 and (t.status<>'planned' or not coalesce(t.recurrence_suspended,false))
 and (t.deleted_at is not null)=coalesce((p_filter->>'deletedOnly')::boolean,false)
 and (nullif(p_filter->>'accountId','') is null or (p_filter->>'accountId')::uuid in(t.account_id,t.counter_account_id,t.loan_account_id))
 and (case when p_filter->>'categoryId'='none' then t.category_id is null when nullif(p_filter->>'categoryId','') is null then true else t.category_id=(p_filter->>'categoryId')::uuid end)
 and (nullif(p_filter->>'kind','') is null or t.kind=p_filter->>'kind')
 and (nullif(p_filter->>'status','') is null or t.status=p_filter->>'status')
 and (nullif(p_filter->>'from','') is null or t.transaction_date>=(p_filter->>'from')::date)
 and (nullif(p_filter->>'to','') is null or t.transaction_date<=(p_filter->>'to')::date)
 and (nullif(p_filter->>'importBatchId','') is null or (p_filter->>'importBatchId')::uuid in(t.import_batch_id,t.counter_import_batch_id))
 and (coalesce(jsonb_array_length(p_filter->'ids'),0)=0 or t.id=any(array(select value::uuid from jsonb_array_elements_text(p_filter->'ids'))))
 and (not coalesce((p_filter->>'needsReview')::boolean,false) or (t.deleted_at is null and t.status='completed' and (t.review_required=true or(t.kind<>'transfer' and t.category_id is null))))
 and (nullif(p_filter->>'pendingAccountId','') is null or (t.deleted_at is null and t.status='completed' and case when t.account_id=(p_filter->>'pendingAccountId')::uuid then t.account_verified_at is null when t.kind='transfer' and t.counter_account_id=(p_filter->>'pendingAccountId')::uuid then t.counter_verified_at is null else false end))
 and (nullif(btrim(p_filter->>'search'),'') is null or strpos(lower(t.description||' '||coalesce(t.notes,'')),lower(btrim(p_filter->>'search')))>0)
$function$;
CREATE OR REPLACE FUNCTION public.finance_confirm_balance(p_account uuid, p_value text, p_version bigint, p_anchor timestamp with time zone, p_confirm_difference boolean, p_note text DEFAULT NULL::text)
 RETURNS public.finance_accounts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.finance_accounts;w uuid;v numeric;raw text;h uuid;stamp timestamptz;checks jsonb;
begin
 select workspace_id into w from public.finance_accounts where id=p_account;
 if coalesce(finance_private.member_role(w),'') not in('owner','manager') then raise exception 'Немає доступу';end if;
 raw:=replace(replace(regexp_replace(coalesce(p_value,''),'[[:space:]]','','g'),chr(160),''),chr(8239),'');raw:=replace(replace(raw,',','.'),'−','-');
 if raw!~'^[+-]?[0-9]+([.][0-9]{1,2})?$' then raise exception 'Введіть фактичний залишок, наприклад -41116,45. Порожнє поле не є нулем.';end if;
 v:=raw::numeric;if abs(v)>=1000000000000 then raise exception 'Завеликий залишок';end if;
 perform 1 from public.finance_workspaces where id=w for update;
 select * into strict a from public.finance_accounts where id=p_account and archived_at is null for update;
 if p_version is null or p_anchor is null or a.ledger_version<>p_version or a.balance_anchor_at<>p_anchor then raise exception 'Рахунок змінився під час звірки. Закрийте форму й відкрийте її знову.';end if;
 if abs(v-a.current_balance)>=0.01 and not coalesce(p_confirm_difference,false) then raise exception 'Підтвердьте різницю перед зміною залишку';end if;
 stamp:=clock_timestamp();
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'verified',case when account_id=p_account then account_verified_at else counter_verified_at end)),'[]') into checks from public.finance_transactions where workspace_id=w and status='completed' and deleted_at is null and transaction_date<=(stamp at time zone 'Europe/Kyiv')::date and (account_id=p_account or kind='transfer' and counter_account_id=p_account);
 insert into public.finance_balance_history(workspace_id,account_id,old_balance,new_balance,difference,note,before_state,checks_before,after_version) values(w,p_account,a.current_balance,v,v-a.current_balance,left(p_note,200),to_jsonb(a),checks,a.ledger_version+1) returning id into h;
 update public.finance_accounts set current_balance=v,balance_anchor_amount=v,balance_anchor_at=stamp,balance_anchor_date=(stamp at time zone 'Europe/Kyiv')::date,current_balance_updated_at=stamp,last_reconciled_at=stamp,last_reconciliation_id=h,ledger_version=ledger_version+1 where id=p_account;
 update public.finance_transactions set account_verified_at=case when account_id=p_account then stamp else account_verified_at end,counter_verified_at=case when counter_account_id=p_account then stamp else counter_verified_at end where workspace_id=w and status='completed' and deleted_at is null and transaction_date<=(stamp at time zone 'Europe/Kyiv')::date and (account_id=p_account or kind='transfer' and counter_account_id=p_account);
 select * into a from public.finance_accounts where id=p_account;return a;
end $function$;
notify pgrst, 'reload schema';
