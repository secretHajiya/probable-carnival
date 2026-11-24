-- Vyra Rewards Global — Step 38: Finance-only PayPal reconciliation inspection queue
-- Apply only after Migration 031 has been reviewed and safely applied.
begin;
create or replace function public.paypal_list_reconciliation_queue()
returns table (
  withdrawal_id uuid,
  sender_batch_id text,
  provider_batch_id text,
  amount_minor bigint,
  currency_code char(3),
  status text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.withdrawal_id, a.sender_batch_id, a.provider_batch_id,
         a.amount_minor, a.currency_code, a.status, a.updated_at
    from public.paypal_payout_attempts a
   where a.status in ('reconciling', 'quarantined')
   order by a.updated_at asc
   limit 200;
$$;
revoke all on function public.paypal_list_reconciliation_queue() from public, anon, authenticated;
grant execute on function public.paypal_list_reconciliation_queue() to service_role;
commit;
