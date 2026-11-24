-- Vyra Rewards Global — standalone migration 005: withdrawal config and audited-review prerequisite
-- Disabled by default. Configure country limits/rates and payout-details token service before enabling.
begin;

create table if not exists public.withdrawal_config (
  country_code char(2) primary key references public.countries(code),
  min_coins bigint not null check (min_coins > 0),
  max_coins bigint not null check (max_coins >= min_coins),
  fee_bps integer not null default 0 check (fee_bps between 0 and 10000),
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.withdrawal_config enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'withdrawal_config'
      and policyname = 'Members read enabled withdrawal config'
  ) then
    create policy "Members read enabled withdrawal config"
      on public.withdrawal_config for select to authenticated
      using (is_enabled = true or public.is_finance_admin());
  end if;
end;
$$;

create unique index if not exists withdrawal_reviews_withdrawal_reviewer_uidx
  on public.withdrawal_reviews(withdrawal_id, reviewer_id);

-- No config row is enabled by this migration. This deliberately prevents live requests
-- until the operator has set limits and confirmed the exchange rate and payout details service.
revoke all on public.withdrawal_config from anon, authenticated;
grant select on public.withdrawal_config to authenticated;

-- The secure create_withdrawal_request(bigint,text) implementation is installed
-- later by 013_secure_payout_details_vault.sql. Do not install the legacy
-- length-only token implementation from Step 10.

create or replace function public.review_withdrawal_request(
  p_withdrawal_id uuid,
  p_decision text,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer uuid := auth.uid();
  v_request public.withdrawal_requests%rowtype;
begin
  if v_reviewer is null or not public.is_finance_admin() then
    raise exception 'finance_admin_required';
  end if;
  if p_decision is null or p_decision not in ('approved','rejected','needs_info') then
    raise exception 'invalid_decision';
  end if;

  select * into v_request
  from public.withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'withdrawal_not_found'; end if;
  if v_request.user_id = v_reviewer then raise exception 'self_review_not_allowed'; end if;
  if v_request.status not in ('requested','under_review') then
    raise exception 'withdrawal_not_reviewable';
  end if;

  -- One current review row per reviewer/request. A later decision after
  -- needs_info updates that row; the audited wrapper records each transition
  -- in admin_audit_logs, preserving the decision history.
  insert into public.withdrawal_reviews(withdrawal_id, reviewer_id, decision, note)
  values (p_withdrawal_id, v_reviewer, p_decision, left(coalesce(p_note,''),1000))
  on conflict (withdrawal_id, reviewer_id) do update
    set decision = excluded.decision,
        note = excluded.note;

  if p_decision = 'needs_info' then
    update public.withdrawal_requests
      set status = 'under_review', reviewed_at = now(),
          reviewed_by = v_reviewer, updated_at = now()
    where id = p_withdrawal_id;
    return 'needs_info';
  elsif p_decision = 'approved' then
    update public.withdrawal_requests
      set status = 'approved', reviewed_at = now(),
          reviewed_by = v_reviewer, updated_at = now()
    where id = p_withdrawal_id;
    return 'approved';
  else
    -- Rejection releases the previously reserved coins exactly once.
    update public.wallet_accounts
      set available_coins = available_coins + v_request.amount_coins,
          updated_at = now()
    where user_id = v_request.user_id;

    insert into public.wallet_ledger(
      user_id, entry_type, amount_coins, balance_bucket, reference_type,
      reference_id, idempotency_key, description, created_by
    ) values (
      v_request.user_id, 'withdrawal_released', v_request.amount_coins,
      'available', 'withdrawal', p_withdrawal_id::text,
      'withdrawal-release:' || p_withdrawal_id::text,
      'Reserved coins released after withdrawal rejection', v_reviewer
    );

    update public.withdrawal_requests
      set status = 'rejected', reviewed_at = now(),
          reviewed_by = v_reviewer, rejection_reason = left(coalesce(p_note,''),1000),
          updated_at = now()
    where id = p_withdrawal_id;
    return 'rejected';
  end if;
end;
$$;

revoke all on function public.review_withdrawal_request(uuid,text,text) from public, anon, authenticated;
grant execute on function public.review_withdrawal_request(uuid,text,text) to authenticated;

commit;
