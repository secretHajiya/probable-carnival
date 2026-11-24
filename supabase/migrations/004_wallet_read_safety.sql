-- Vyra Rewards Global — Step 09: wallet read safety
-- Forward-only migration. Does not create coins, alter balances, or enable payouts.
begin;

create index if not exists wallet_ledger_user_created_id_idx
  on public.wallet_ledger (user_id, created_at desc, id desc);

-- Members may read their own wallet through existing RLS policies.
-- All wallet writes remain server-side (trusted Edge Functions / service role).
revoke insert, update, delete on public.wallet_accounts from anon, authenticated;
revoke insert, update, delete on public.wallet_ledger from anon, authenticated;
grant select on public.wallet_accounts to authenticated;
grant select on public.wallet_ledger to authenticated;

comment on table public.wallet_accounts is
  'Balance snapshot. Must only be changed by trusted server-side wallet posting logic.';
comment on table public.wallet_ledger is
  'Append-only wallet audit ledger. Client roles are read-only; use trusted server-side posting logic.';

commit;
