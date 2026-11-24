-- READ-ONLY preflight for Migration 013. Run against STAGING first.
-- This script does not create, alter, update, or delete any database object/data.
with required_columns(table_name, column_name) as (
  values
    ('countries','code'), ('countries','currency_code'), ('countries','is_enabled'),
    ('profiles','id'), ('profiles','country_code'), ('profiles','status'),
    ('wallet_accounts','user_id'), ('wallet_accounts','available_coins'), ('wallet_accounts','updated_at'),
    ('withdrawal_config','country_code'), ('withdrawal_config','min_coins'), ('withdrawal_config','max_coins'), ('withdrawal_config','fee_bps'), ('withdrawal_config','is_enabled'),
    ('exchange_rates','country_code'), ('exchange_rates','currency_code'), ('exchange_rates','coins_per_major_unit'), ('exchange_rates','effective_from'), ('exchange_rates','effective_to'),
    ('withdrawal_requests','id'), ('withdrawal_requests','user_id'), ('withdrawal_requests','country_code'), ('withdrawal_requests','payout_method'), ('withdrawal_requests','amount_coins'), ('withdrawal_requests','amount_minor'), ('withdrawal_requests','currency_code'), ('withdrawal_requests','fee_minor'), ('withdrawal_requests','status'), ('withdrawal_requests','payout_details_token'),
    ('wallet_ledger','user_id'), ('wallet_ledger','entry_type'), ('wallet_ledger','amount_coins'), ('wallet_ledger','balance_bucket'), ('wallet_ledger','reference_type'), ('wallet_ledger','reference_id'), ('wallet_ledger','idempotency_key'), ('wallet_ledger','description'), ('wallet_ledger','created_by'),
    ('admin_audit_logs','actor_user_id'), ('admin_audit_logs','action'), ('admin_audit_logs','target_type'), ('admin_audit_logs','target_id'), ('admin_audit_logs','after_data')
), column_checks as (
  select r.table_name, r.column_name,
         exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name) as present
  from required_columns r
), checks as (
  select 'required_column'::text as check_name,
         case when bool_and(present) then 'PASS' else 'FAIL' end as result,
         string_agg(case when not present then table_name||'.'||column_name end, ', ' order by table_name,column_name) filter (where not present) as details
  from column_checks
  union all
  select 'pgcrypto_extension', case when exists(select 1 from pg_extension where extname='pgcrypto') then 'PASS' else 'FAIL' end,
         coalesce((select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto'),'pgcrypto not installed')
  union all
  select 'finance_admin_rpc', case when to_regprocedure('public.is_finance_admin()') is not null then 'PASS' else 'FAIL' end,
         coalesce(to_regprocedure('public.is_finance_admin()')::text,'function missing')
  union all
  select 'create_withdrawal_rpc_signature', case when to_regprocedure('public.create_withdrawal_request(bigint,text)') is not null then 'PASS' else 'FAIL' end,
         coalesce(to_regprocedure('public.create_withdrawal_request(bigint,text)')::text,'expected signature missing')
  union all
  select 'withdrawal_status_enum', case when exists(select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='withdrawal_status') then 'PASS' else 'FAIL' end,
         coalesce((select string_agg(e.enumlabel, ', ' order by e.enumsortorder) from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' and t.typname='withdrawal_status'),'enum missing or not an enum')
  union all
  select 'withdrawal_config_table', case when to_regclass('public.withdrawal_config') is not null then 'PASS' else 'FAIL' end,
         coalesce(to_regclass('public.withdrawal_config')::text,'table missing; Migration 013 expects Step 10 config')
  union all
  select 'ledger_idempotency_unique', case when exists (
      select 1 from pg_index i join pg_class t on t.oid=i.indrelid join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public' and t.relname='wallet_ledger' and i.indisunique
        and pg_get_indexdef(i.indexrelid) ilike '%idempotency_key%'
    ) then 'PASS' else 'FAIL' end,
    'wallet_ledger must have a unique index covering idempotency_key'
)
select check_name, result, coalesce(details,'') as details from checks order by check_name;

-- Review the current RPC body and ACL before replacing it. This is informational only.
select p.oid::regprocedure as function_signature,
       pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       pg_get_functiondef(p.oid) as current_definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='create_withdrawal_request';

-- Confirm all countries remain disabled before enabling anything.
select country_code, is_enabled, min_coins, max_coins, fee_bps
from public.withdrawal_config
order by country_code;
