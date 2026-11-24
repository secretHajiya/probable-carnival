-- Vyra Rewards Global — Step 31: US-only PayPal sandbox payout foundation
-- Apply to a dedicated STAGING database first. Does not enable either country's withdrawals.
begin;

alter table public.withdrawal_requests
  drop constraint if exists withdrawal_requests_payout_method_check;
alter table public.withdrawal_requests
  add constraint withdrawal_requests_payout_method_check
  check (payout_method in ('bank_transfer','paypal'));

create table if not exists public.paypal_recipient_vault (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code char(2) not null default 'US' check (country_code = 'US'),
  payout_method text not null default 'paypal' check (payout_method = 'paypal'),
  token_hash text not null unique,
  encrypted_payload text not null,
  nonce text not null,
  key_version text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  withdrawal_id uuid unique references public.withdrawal_requests(id),
  created_at timestamptz not null default now()
);
alter table public.paypal_recipient_vault enable row level security;
revoke all on public.paypal_recipient_vault from public, anon, authenticated;
grant all on public.paypal_recipient_vault to service_role;
create index if not exists paypal_recipient_vault_user_created_idx
  on public.paypal_recipient_vault(user_id, created_at desc);

create table if not exists public.paypal_payout_attempts (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null unique references public.withdrawal_requests(id),
  sender_batch_id text not null unique,
  provider_batch_id text unique,
  provider_item_id text unique,
  amount_minor bigint not null check (amount_minor > 0),
  currency_code char(3) not null check (currency_code = 'USD'),
  status text not null check (status in ('claimed','submitted','reconciling','succeeded','failed','quarantined')),
  last_event_id text,
  last_event_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.paypal_payout_attempts enable row level security;
revoke all on public.paypal_payout_attempts from public, anon, authenticated;
grant all on public.paypal_payout_attempts to service_role;

create table if not exists public.paypal_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  sender_batch_id text,
  provider_item_id text,
  verification_status text not null check (verification_status = 'SUCCESS'),
  processed_at timestamptz not null default now()
);
alter table public.paypal_webhook_events enable row level security;
revoke all on public.paypal_webhook_events from public, anon, authenticated;
grant all on public.paypal_webhook_events to service_role;

-- A member may create only a US/USD PayPal request with a one-use token issued to them.
create or replace function public.create_us_paypal_withdrawal_request(
  p_amount_coins bigint,
  p_recipient_token text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_country char(2); v_currency char(3);
  v_min bigint; v_max bigint; v_fee_bps integer; v_rate bigint;
  v_amount_minor bigint; v_fee_minor bigint; v_wallet public.wallet_accounts%rowtype;
  v_vault public.paypal_recipient_vault%rowtype; v_withdrawal uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_amount_coins is null or p_amount_coins <= 0 then raise exception 'invalid_amount'; end if;
  if p_recipient_token is null or length(trim(p_recipient_token)) < 32 then raise exception 'invalid_recipient_token'; end if;
  select * into v_vault from public.paypal_recipient_vault
   where token_hash = public.vyra_sha256(trim(p_recipient_token)) for update;
  if not found or v_vault.user_id <> v_user or v_vault.consumed_at is not null or v_vault.expires_at <= now()
    then raise exception 'invalid_or_expired_paypal_token'; end if;
  select p.country_code into v_country from public.profiles p where p.id = v_user and p.status = 'active';
  if v_country <> 'US' or v_vault.country_code <> 'US' or v_vault.payout_method <> 'paypal'
    then raise exception 'us_paypal_only'; end if;
  select c.currency_code into v_currency from public.countries c where c.code = 'US' and c.is_enabled;
  if v_currency <> 'USD' then raise exception 'us_usd_country_configuration_required'; end if;
  select min_coins,max_coins,fee_bps into v_min,v_max,v_fee_bps
    from public.withdrawal_config where country_code = 'US' and is_enabled = true;
  if not found then raise exception 'withdrawals_not_enabled_for_country'; end if;
  if p_amount_coins < v_min or p_amount_coins > v_max then raise exception 'amount_out_of_allowed_range'; end if;
  select coins_per_major_unit into v_rate from public.exchange_rates
   where country_code='US' and currency_code='USD' and effective_from <= now()
     and (effective_to is null or effective_to > now()) order by effective_from desc limit 1;
  if v_rate is null or v_rate <= 0 then raise exception 'active_usd_exchange_rate_required'; end if;
  if p_amount_coins > 92233720368547758 then raise exception 'amount_overflow'; end if;
  v_amount_minor := (p_amount_coins * 100) / v_rate;
  if v_amount_minor <= 0 then raise exception 'amount_below_smallest_payout_unit'; end if;
  v_fee_minor := ((v_amount_minor::numeric * v_fee_bps::numeric) / 10000)::bigint;
  if v_amount_minor <= v_fee_minor then raise exception 'payout_net_amount_invalid'; end if;
  select * into v_wallet from public.wallet_accounts where user_id=v_user for update;
  if not found or v_wallet.available_coins < p_amount_coins then raise exception 'insufficient_available_coins'; end if;
  update public.wallet_accounts set available_coins=available_coins-p_amount_coins, updated_at=now() where user_id=v_user;
  insert into public.withdrawal_requests(user_id,country_code,payout_method,amount_coins,amount_minor,currency_code,fee_minor,status)
    values(v_user,'US','paypal',p_amount_coins,v_amount_minor,'USD',v_fee_minor,'requested') returning id into v_withdrawal;
  update public.paypal_recipient_vault set consumed_at=now(),withdrawal_id=v_withdrawal where id=v_vault.id;
  insert into public.wallet_ledger(user_id,entry_type,amount_coins,balance_bucket,reference_type,reference_id,idempotency_key,description,created_by)
    values(v_user,'withdrawal_reserved',p_amount_coins,'available','withdrawal',v_withdrawal::text,
      'withdrawal-reserve:'||v_withdrawal::text,'Coins reserved for US PayPal withdrawal',v_user);
  return v_withdrawal;
end; $$;
revoke all on function public.create_us_paypal_withdrawal_request(bigint,text) from public,anon;
grant execute on function public.create_us_paypal_withdrawal_request(bigint,text) to authenticated;

-- Called only by the isolated Cloudflare Worker using the service-role key, after it
-- has independently authenticated a finance administrator. The unique withdrawal
-- and sender batch constraints make repeated claims deterministic.
create or replace function public.paypal_claim_payout(p_withdrawal_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_w public.withdrawal_requests%rowtype; v_v public.paypal_recipient_vault%rowtype;
  v_a public.paypal_payout_attempts%rowtype; v_batch text;
begin
  select * into v_w from public.withdrawal_requests where id=p_withdrawal_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  if v_w.country_code <> 'US' or v_w.payout_method <> 'paypal' or v_w.currency_code <> 'USD'
    then raise exception 'paypal_usd_withdrawal_required'; end if;
  if v_w.status not in ('approved','processing') then raise exception 'withdrawal_not_approved'; end if;
  select * into v_v from public.paypal_recipient_vault where withdrawal_id=v_w.id;
  if not found then raise exception 'paypal_recipient_not_found'; end if;
  select * into v_a from public.paypal_payout_attempts where withdrawal_id=v_w.id for update;
  if not found then
    v_batch := 'VYRA' || upper(replace(v_w.id::text,'-',''));
    insert into public.paypal_payout_attempts(withdrawal_id,sender_batch_id,amount_minor,currency_code,status)
      values(v_w.id,v_batch,v_w.amount_minor-v_w.fee_minor,'USD','claimed') returning * into v_a;
    update public.withdrawal_requests set status='processing',updated_at=now() where id=v_w.id;
    insert into public.payout_records(withdrawal_id,provider_name,provider_reference,amount_minor,currency_code,status)
      values(v_w.id,'paypal',v_batch,v_w.amount_minor-v_w.fee_minor,'USD','initiated')
      on conflict(withdrawal_id) do nothing;
  end if;
  if v_a.status in ('succeeded','failed','quarantined') then raise exception 'payout_attempt_terminal'; end if;
  return jsonb_build_object('withdrawal_id',v_w.id,'sender_batch_id',v_a.sender_batch_id,
    'provider_batch_id',v_a.provider_batch_id,'status',v_a.status,
    'amount_minor',v_a.amount_minor,'currency_code',v_a.currency_code,
    'encrypted_payload',v_v.encrypted_payload,'nonce',v_v.nonce,'key_version',v_v.key_version);
end; $$;
revoke all on function public.paypal_claim_payout(uuid) from public,anon,authenticated;
grant execute on function public.paypal_claim_payout(uuid) to service_role;

-- A definitive provider rejection is quarantined, not marked submitted and not
-- automatically refunded. This avoids duplicate payouts or unsafe coin release when
-- the provider's response needs manual reconciliation.
create or replace function public.paypal_record_submission(
  p_withdrawal_id uuid,
  p_provider_batch_id text,
  p_provider_item_id text,
  p_ambiguous boolean default false,
  p_rejected boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_ambiguous and p_rejected then raise exception 'invalid_submission_outcome'; end if;
  update public.paypal_payout_attempts set
    provider_batch_id=coalesce(provider_batch_id,p_provider_batch_id),
    provider_item_id=coalesce(provider_item_id,p_provider_item_id),
    status=case when p_rejected then 'quarantined'
                when p_ambiguous then 'reconciling'
                else 'submitted' end,
    updated_at=now()
   where withdrawal_id=p_withdrawal_id and status in ('claimed','submitted','reconciling');
  if not found then raise exception 'payout_attempt_not_claimed'; end if;
  update public.payout_records set
    provider_reference=coalesce(provider_reference,p_provider_batch_id),
    updated_at=now()
   where withdrawal_id=p_withdrawal_id and provider_name='paypal';
end; $$;
revoke all on function public.paypal_record_submission(uuid,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.paypal_record_submission(uuid,text,text,boolean,boolean) to service_role;

-- Only verified, correlated PayPal item events reach this RPC. Event ID and ledger
-- idempotency keys prevent duplicate settlement. Failed payouts release reserved coins once.
create or replace function public.paypal_finalize_event(
  p_event_id text,p_event_type text,p_sender_batch_id text,p_provider_item_id text,p_outcome text,p_amount_minor bigint,p_currency_code text
) returns text language plpgsql security definer set search_path = '' as $$
declare v_a public.paypal_payout_attempts%rowtype; v_w public.withdrawal_requests%rowtype; v_rows integer;
begin
  if p_event_id is null or p_event_id='' or p_outcome not in ('succeeded','failed') then raise exception 'invalid_paypal_event'; end if;
  if (p_outcome = 'succeeded' and p_event_type <> 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED')
     or (p_outcome = 'failed' and p_event_type not in ('PAYMENT.PAYOUTS-ITEM.FAILED','PAYMENT.PAYOUTS-ITEM.BLOCKED','PAYMENT.PAYOUTS-ITEM.RETURNED')) then
    raise exception 'paypal_event_outcome_mismatch';
  end if;
  insert into public.paypal_webhook_events(provider_event_id,event_type,sender_batch_id,provider_item_id,verification_status)
   values(p_event_id,p_event_type,p_sender_batch_id,p_provider_item_id,'SUCCESS') on conflict(provider_event_id) do nothing;
  if not found then return 'duplicate_event'; end if;
  select * into v_a from public.paypal_payout_attempts
   where (sender_batch_id=p_sender_batch_id or provider_batch_id=p_sender_batch_id)
     and provider_item_id=p_provider_item_id for update;
  if not found then
    delete from public.paypal_webhook_events where provider_event_id=p_event_id;
    raise exception 'unknown_paypal_payout_reference';
  end if;
  if p_currency_code is distinct from 'USD' or p_amount_minor is distinct from v_a.amount_minor then
    update public.paypal_payout_attempts set status='quarantined',last_event_id=p_event_id,last_event_type=p_event_type,updated_at=now() where id=v_a.id;
    return 'amount_or_currency_mismatch_quarantined';
  end if;
  select * into v_w from public.withdrawal_requests where id=v_a.withdrawal_id for update;
  if v_a.status in ('succeeded','failed','quarantined') then return 'terminal_noop'; end if;
  if p_outcome='succeeded' then
    update public.paypal_payout_attempts set status='succeeded',last_event_id=p_event_id,last_event_type=p_event_type,updated_at=now() where id=v_a.id;
    update public.withdrawal_requests set status='paid',paid_at=now(),payout_reference=p_provider_item_id,updated_at=now() where id=v_w.id and status='processing';
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then raise exception 'paypal_withdrawal_paid_transition_failed'; end if;
    update public.payout_records set status='succeeded',provider_reference=p_sender_batch_id,proof_reference=p_provider_item_id,updated_at=now() where withdrawal_id=v_w.id and provider_name='paypal';
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then raise exception 'paypal_payout_record_success_update_failed'; end if;
    insert into public.wallet_ledger(user_id,entry_type,amount_coins,balance_bucket,reference_type,reference_id,idempotency_key,description)
      values(v_w.user_id,'withdrawal_paid',v_w.amount_coins,'reserved','withdrawal',v_w.id::text,
        'withdrawal-paid:'||v_w.id::text,'US PayPal payout settled');
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then raise exception 'paypal_paid_ledger_insert_failed'; end if;
  else
    update public.paypal_payout_attempts set status='failed',last_event_id=p_event_id,last_event_type=p_event_type,updated_at=now() where id=v_a.id;
    update public.withdrawal_requests set status='failed',updated_at=now() where id=v_w.id and status='processing';
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then raise exception 'paypal_withdrawal_failed_transition_failed'; end if;
    update public.payout_records set status='failed',proof_reference=p_provider_item_id,updated_at=now() where withdrawal_id=v_w.id and provider_name='paypal';
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then raise exception 'paypal_payout_record_failure_update_failed'; end if;
    update public.wallet_accounts set available_coins=available_coins+v_w.amount_coins,updated_at=now() where user_id=v_w.user_id;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then raise exception 'paypal_wallet_account_missing'; end if;
    insert into public.wallet_ledger(user_id,entry_type,amount_coins,balance_bucket,reference_type,reference_id,idempotency_key,description)
      values(v_w.user_id,'withdrawal_released',v_w.amount_coins,'available','withdrawal',v_w.id::text,
        'withdrawal-release:'||v_w.id::text,'Coins released after failed US PayPal payout');
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then raise exception 'paypal_release_ledger_insert_failed'; end if;
  end if;
  return p_outcome;
end; $$;
revoke all on function public.paypal_finalize_event(text,text,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.paypal_finalize_event(text,text,text,text,text,bigint,text) to service_role;

-- Explicitly preserve both countries disabled. This is a safety assertion, not activation.
update public.withdrawal_config set is_enabled=false where country_code in ('NG','US');
commit;
