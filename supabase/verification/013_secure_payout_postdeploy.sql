-- READ-ONLY post-deployment verification for Migration 013.
select to_regclass('public.payout_details_vault') as vault_table,
       to_regprocedure('public.vyra_sha256(text)') as token_hash_function,
       to_regprocedure('public.create_withdrawal_request(bigint,text)') as withdrawal_rpc;

select c.relname as table_name, c.relrowsecurity as rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
       has_table_privilege('service_role', c.oid, 'SELECT') as service_role_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='payout_details_vault';

select p.oid::regprocedure as function_signature,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('create_withdrawal_request','vyra_sha256');

select count(*) as enabled_withdrawal_countries
from public.withdrawal_config where is_enabled;

-- Must return zero rows: a token may be linked to at most one withdrawal.
select token_hash, count(*) as linked_rows
from public.payout_details_vault
where withdrawal_id is not null
group by token_hash having count(*) > 1;
