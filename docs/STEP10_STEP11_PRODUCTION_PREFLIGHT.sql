-- Vyra Rewards Global — Step 10/11 Production preflight
-- READ-ONLY: run this BEFORE applying migrations 005 and 006.
-- It does not insert, update, delete, create, or alter any object.

-- 1) Required tables and helper functions
select x.object_name,
       case when to_regclass('public.' || x.object_name) is null then 'MISSING' else 'present' end as result
from (values
  ('countries'), ('profiles'), ('exchange_rates'), ('wallet_accounts'),
  ('wallet_ledger'), ('withdrawal_requests'), ('withdrawal_reviews'), ('admin_audit_logs')
) as x(object_name)
order by x.object_name;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_finance_admin','is_active_admin',
    'create_withdrawal_request','review_withdrawal_request',
    'admin_get_finance_overview','admin_list_withdrawals',
    'admin_review_withdrawal_audited')
order by p.proname;

-- 2) Wallet columns required by Step 10/11
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'wallet_accounts'
  and column_name in ('user_id','available_coins','pending_coins',
                      'lifetime_earned_coins','updated_at')
order by column_name;

-- 3) Review uniqueness precheck. Must return ZERO rows before creating the index.
select withdrawal_id, reviewer_id, count(*) as duplicate_count
from public.withdrawal_reviews
group by withdrawal_id, reviewer_id
having count(*) > 1;

-- 4) Existing withdrawal_config object and policies
select to_regclass('public.withdrawal_config') as withdrawal_config_table;
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'withdrawal_config'
order by policyname;

-- 5) Required columns used by the migrations and Admin UI
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and (
  (table_name = 'withdrawal_requests' and column_name in
    ('id','user_id','country_code','payout_method','amount_coins','amount_minor',
     'currency_code','fee_minor','status','payout_details_token','rejection_reason',
     'requested_at','reviewed_at','reviewed_by','updated_at'))
  or (table_name = 'withdrawal_reviews' and column_name in
    ('withdrawal_id','reviewer_id','decision','note'))
  or (table_name = 'admin_audit_logs' and column_name in
    ('actor_user_id','action','target_type','target_id','before_data','after_data'))
  or (table_name = 'profiles' and column_name in ('id','display_name','country_code','status'))
  or (table_name = 'exchange_rates' and column_name in
    ('country_code','currency_code','coins_per_major_unit','effective_from','effective_to'))
)
order by table_name, column_name;

-- 6) Existing unique index and idempotency protection
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and (tablename = 'withdrawal_reviews' or tablename = 'wallet_ledger')
order by tablename, indexname;
