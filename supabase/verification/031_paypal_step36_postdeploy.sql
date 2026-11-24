-- Step36 read-only verification after Migration 031 is deliberately applied in a test database.
select to_regprocedure('public.paypal_finalize_event(text,text,text,text,text,bigint,text)') as finalize_function;
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid='public.wallet_ledger'::regclass and contype in ('u','c');
select indexname,indexdef from pg_indexes where schemaname='public' and tablename in ('wallet_ledger','paypal_payout_attempts','paypal_webhook_events');
select country_code,is_enabled from public.withdrawal_config where country_code in ('NG','US') order by country_code;
