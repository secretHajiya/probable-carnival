-- Vyra Rewards Global — secure payout vault and atomic token consumption.
-- Apply only after reviewing Production function definitions and testing on staging.
begin;

create table if not exists public.payout_details_vault (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  country_code char(2) not null references public.countries(code),
  payout_method text not null check (payout_method = 'bank_transfer'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  encrypted_payload text not null,
  nonce text not null,
  key_version text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  withdrawal_id uuid unique references public.withdrawal_requests(id),
  created_at timestamptz not null default now()
);

-- Resolve the installed pgcrypto schema instead of assuming it is `public` or `extensions`.
-- The RPC has an empty search_path, so the digest function must be schema-qualified.
do $$
declare
  v_crypto_schema text;
begin
  select n.nspname into v_crypto_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';
  if v_crypto_schema is null then
    raise exception 'pgcrypto_extension_required';
  end if;
  execute format(
    'create or replace function public.vyra_sha256(p_value text) returns text language sql immutable strict set search_path = '''' as $fn$ select encode(%I.digest(convert_to(p_value, ''UTF8''), ''sha256''), ''hex'') $fn$',
    v_crypto_schema
  );
end;
$$;
revoke all on function public.vyra_sha256(text) from public, anon, authenticated;

alter table public.payout_details_vault enable row level security;
revoke all on public.payout_details_vault from public, anon, authenticated;
grant all on public.payout_details_vault to service_role;

create index if not exists payout_details_vault_owner_created_idx
  on public.payout_details_vault(user_id, created_at desc);

-- This replaces the earlier length-only token check. The token is verified by hash,
-- locked, and consumed in the same transaction that reserves the wallet balance.
create or replace function public.create_withdrawal_request(
  p_amount_coins bigint,
  p_payout_details_token text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_country char(2);
  v_currency char(3);
  v_min bigint;
  v_max bigint;
  v_fee_bps integer;
  v_coins_per_major bigint;
  v_amount_minor bigint;
  v_fee_minor bigint;
  v_wallet public.wallet_accounts%rowtype;
  v_withdrawal_id uuid;
  v_vault public.payout_details_vault%rowtype;
  v_token_hash text;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_amount_coins is null or p_amount_coins <= 0 then raise exception 'invalid_amount'; end if;
  if p_payout_details_token is null or length(trim(p_payout_details_token)) < 32 then
    raise exception 'invalid_payout_details_token';
  end if;
  v_token_hash := public.vyra_sha256(trim(p_payout_details_token));

  select * into v_vault from public.payout_details_vault
  where token_hash = v_token_hash for update;
  if not found or v_vault.user_id <> v_user_id or v_vault.consumed_at is not null
     or v_vault.expires_at <= now() then raise exception 'invalid_or_expired_payout_token'; end if;

  select p.country_code into v_country from public.profiles p
  where p.id = v_user_id and p.status = 'active';
  if v_country is null then raise exception 'active_profile_and_country_required'; end if;
  if v_vault.country_code <> v_country or v_vault.payout_method <> 'bank_transfer' then
    raise exception 'payout_token_context_mismatch';
  end if;

  select c.currency_code into v_currency from public.countries c
  where c.code = v_country and c.is_enabled = true;
  if v_currency is null then raise exception 'country_not_enabled'; end if;

  select wc.min_coins, wc.max_coins, wc.fee_bps into v_min, v_max, v_fee_bps
  from public.withdrawal_config wc where wc.country_code = v_country and wc.is_enabled = true;
  if not found then raise exception 'withdrawals_not_enabled_for_country'; end if;
  if p_amount_coins < v_min or p_amount_coins > v_max then raise exception 'amount_out_of_allowed_range'; end if;

  select er.coins_per_major_unit into v_coins_per_major from public.exchange_rates er
  where er.country_code = v_country and er.currency_code = v_currency
    and er.effective_from <= now() and (er.effective_to is null or er.effective_to > now())
  order by er.effective_from desc limit 1;
  if v_coins_per_major is null or v_coins_per_major <= 0 then raise exception 'active_exchange_rate_required'; end if;
  if p_amount_coins > 92233720368547758 then raise exception 'amount_overflow'; end if;
  v_amount_minor := (p_amount_coins * 100) / v_coins_per_major;
  if v_amount_minor <= 0 then raise exception 'amount_below_smallest_payout_unit'; end if;
  v_fee_minor := ((v_amount_minor::numeric * v_fee_bps::numeric) / 10000)::bigint;

  select * into v_wallet from public.wallet_accounts wa where wa.user_id = v_user_id for update;
  if not found then raise exception 'wallet_not_found'; end if;
  if v_wallet.available_coins < p_amount_coins then raise exception 'insufficient_available_coins'; end if;

  update public.wallet_accounts set available_coins = available_coins - p_amount_coins, updated_at = now()
  where user_id = v_user_id;
  insert into public.withdrawal_requests(
    user_id, country_code, payout_method, amount_coins, amount_minor, currency_code,
    fee_minor, status, payout_details_token
  ) values (
    v_user_id, v_country, 'bank_transfer', p_amount_coins, v_amount_minor, v_currency,
    v_fee_minor, 'requested', null
  ) returning id into v_withdrawal_id;

  update public.payout_details_vault set consumed_at = now(), withdrawal_id = v_withdrawal_id
  where id = v_vault.id;

  insert into public.wallet_ledger(
    user_id, entry_type, amount_coins, balance_bucket, reference_type, reference_id,
    idempotency_key, description, created_by
  ) values (
    v_user_id, 'withdrawal_reserved', p_amount_coins, 'available', 'withdrawal', v_withdrawal_id::text,
    'withdrawal-reserve:' || v_withdrawal_id::text, 'Coins reserved for withdrawal request', v_user_id
  );
  return v_withdrawal_id;
end;
$$;

revoke all on function public.create_withdrawal_request(bigint,text) from public, anon;
grant execute on function public.create_withdrawal_request(bigint,text) to authenticated;
commit;
