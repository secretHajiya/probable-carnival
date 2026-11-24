-- Vyra Rewards Global — CPX staging preflight (READ ONLY)
-- Run against the dedicated STAGING Supabase project only.
-- This script does not change data, enable providers, or credit wallets.

with rpc as (
  select to_regprocedure(
    'public.process_cpx_reward(uuid,text,text,uuid,integer,bigint,bigint,text,jsonb)'
  ) as oid
), checks as (
  select
    'CPX-01'::text as check_id,
    'Exact process_cpx_reward signature exists'::text as check_name,
    (select oid is not null from rpc) as passed,
    coalesce((select oid::text from rpc), 'missing') as observed
  union all
  select 'CPX-02', 'RPC argument names match Worker call',
    coalesce((select p.proargnames = array[
      'p_provider_id','p_transaction_id','p_external_user_id','p_user_id',
      'p_status','p_reward_coins','p_gross_revenue_minor','p_currency','p_payload'
    ]::text[] from rpc r join pg_proc p on p.oid = r.oid), false),
    coalesce((select array_to_string(p.proargnames, ', ')
      from rpc r join pg_proc p on p.oid = r.oid), 'missing')
  union all
  select 'CPX-03', 'RPC is SECURITY DEFINER',
    coalesce((select p.prosecdef from rpc r join pg_proc p on p.oid = r.oid), false),
    coalesce((select p.prosecdef::text from rpc r join pg_proc p on p.oid = r.oid), 'missing')
  union all
  select 'CPX-04', 'RPC executable by service_role',
    coalesce((select has_function_privilege('service_role', r.oid, 'EXECUTE') from rpc r), false),
    coalesce((select has_function_privilege('service_role', r.oid, 'EXECUTE')::text from rpc r), 'missing')
  union all
  select 'CPX-05', 'RPC not executable by anon',
    coalesce((select not has_function_privilege('anon', r.oid, 'EXECUTE') from rpc r), false),
    coalesce((select has_function_privilege('anon', r.oid, 'EXECUTE')::text from rpc r), 'missing')
  union all
  select 'CPX-06', 'RPC not executable by authenticated',
    coalesce((select not has_function_privilege('authenticated', r.oid, 'EXECUTE') from rpc r), false),
    coalesce((select has_function_privilege('authenticated', r.oid, 'EXECUTE')::text from rpc r), 'missing')
  union all
  select 'CPX-07', 'provider_callbacks transaction/status unique constraint exists',
    exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='provider_callbacks' and c.contype='u'
      and (select array_agg(a.attname order by k.ord)
        from unnest(c.conkey) with ordinality k(attnum,ord)
        join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum)
        = array['provider_id','external_transaction_id','event_status']::name[]
    ),
    coalesce((select string_agg(c.conname, ', ') from pg_constraint c
      join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public' and t.relname='provider_callbacks' and c.contype='u'), 'none')
  union all
  select 'CPX-08', 'offer_completions provider/transaction unique constraint exists',
    exists (
      select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname='public' and t.relname='offer_completions' and c.contype='u'
      and (select array_agg(a.attname order by k.ord)
        from unnest(c.conkey) with ordinality k(attnum,ord)
        join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum)
        = array['provider_id','external_transaction_id']::name[]
    ),
    coalesce((select string_agg(c.conname, ', ') from pg_constraint c
      join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public' and t.relname='offer_completions' and c.contype='u'), 'none')
  union all
  select 'CPX-09', 'wallet_ledger.idempotency_key has unique constraint or index',
    exists (
      select 1 from pg_index i join pg_class t on t.oid=i.indrelid
      join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public' and t.relname='wallet_ledger' and i.indisunique
      and (select array_agg(a.attname order by k.ord)
        from unnest(i.indkey) with ordinality k(attnum,ord)
        join pg_attribute a on a.attrelid=t.oid and a.attnum=k.attnum
        where k.ord <= i.indnkeyatts) = array['idempotency_key']::name[]
    ),
    coalesce((select string_agg(i.indexrelid::regclass::text, ', ') from pg_index i
      join pg_class t on t.oid=i.indrelid join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public' and t.relname='wallet_ledger' and i.indisunique), 'none')
  union all
  select 'CPX-10', 'profiles country/status columns exist',
    (select count(*)=2 from information_schema.columns
      where table_schema='public' and table_name='profiles'
      and column_name in ('country_code','status')),
    coalesce((select string_agg(column_name, ', ' order by column_name)
      from information_schema.columns where table_schema='public'
      and table_name='profiles' and column_name in ('country_code','status')), 'missing')
  union all
  select 'CPX-11', 'reward_providers required columns exist',
    (select count(*)=2 from information_schema.columns
      where table_schema='public' and table_name='reward_providers'
      and column_name in ('code','is_enabled')),
    coalesce((select string_agg(column_name, ', ' order by column_name)
      from information_schema.columns where table_schema='public'
      and table_name='reward_providers' and column_name in ('code','is_enabled')), 'missing')
  union all
  select 'CPX-12', 'provider_apps country/platform/app columns exist',
    (select count(*)=4 from information_schema.columns
      where table_schema='public' and table_name='provider_apps'
      and column_name in ('provider_id','platform','country_code','external_app_id')
    ),
    coalesce((select string_agg(column_name, ', ' order by column_name)
      from information_schema.columns where table_schema='public'
      and table_name='provider_apps'
      and column_name in ('provider_id','platform','country_code','external_app_id')), 'missing')
)
select check_id, check_name,
       case when passed then 'PASS' else 'FAIL' end as result,
       observed
from checks
order by check_id;

-- Also inspect the exact routine body separately before deployment:
-- select pg_get_functiondef(
--   'public.process_cpx_reward(uuid,text,text,uuid,integer,bigint,bigint,text,jsonb)'::regprocedure
-- );
-- Do not share output containing secrets or real member data.
