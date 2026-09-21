-- Manually confirmed debts are destinations/context, never money sources.
-- Existing archived/deleted history can still be removed without reposting it.
do $patch$
declare definition text;needle text:=' if a.currency<>new.currency then';replacement text:=$guard$
 if a.type in('bank_loan','microloan','mortgage','personal_debt') and new.deleted_at is null then
  raise sqlstate 'PT422' using message='Оберіть рахунок, з якого сплачено гроші. Сам кредит укажіть окремо в полі «Кредит або борг».';
 end if;
 if a.currency<>new.currency then$guard$;
begin
 select pg_get_functiondef('finance_private.transaction_before_write()'::regprocedure) into definition;
 if strpos(definition,needle)=0 then raise exception 'Unexpected transaction source validation';end if;
 execute replace(definition,needle,replacement);
end $patch$;
notify pgrst, 'reload schema';
