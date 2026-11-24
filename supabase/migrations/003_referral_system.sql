-- Vyra Rewards Global — Step 08 referral system
-- Forward-only migration. Do not rerun migration 001.
begin;

-- Referral rewards remain disabled until an administrator explicitly configures
-- an approved reward amount and enables the rule.
create table if not exists public.referral_reward_config (
  id boolean primary key default true check (id = true),
  qualification_threshold_coins bigint not null default 10000 check (qualification_threshold_coins > 0),
  referrer_reward_coins bigint not null default 0 check (referrer_reward_coins >= 0),
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.referral_reward_config(id)
values (true)
on conflict (id) do nothing;

-- Ensure profiles created after this migration receive a unique share code.
create or replace function public.assign_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  candidate text;
begin
  if new.referral_code is null or btrim(new.referral_code) = '' then
    loop
      candidate := 'VYRA' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
      exit when not exists (
        select 1 from public.profiles p where p.referral_code = candidate
      );
    end loop;
    new.referral_code := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_assign_referral_code on public.profiles;
create trigger profiles_assign_referral_code
before insert on public.profiles
for each row execute function public.assign_referral_code();

-- A member may attach one referral code to their own account only.
create or replace function public.apply_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_referrer uuid;
  v_existing uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_code is null or length(trim(p_code)) < 4 or length(trim(p_code)) > 32 then
    raise exception 'invalid_referral_code' using errcode = '22023';
  end if;

  select referred_by into v_existing
  from public.profiles where id = v_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if v_existing is not null or exists (
    select 1 from public.referrals r where r.referred_user_id = v_user
  ) then
    raise exception 'referral_already_applied' using errcode = '23505';
  end if;

  select id into v_referrer
  from public.profiles
  where referral_code = upper(trim(p_code))
    and status = 'active';

  if v_referrer is null then
    raise exception 'referral_code_not_found' using errcode = 'P0002';
  end if;
  if v_referrer = v_user then
    raise exception 'self_referral_not_allowed' using errcode = '22023';
  end if;

  update public.profiles
  set referred_by = v_referrer, updated_at = now()
  where id = v_user;

  insert into public.referrals(referrer_user_id, referred_user_id, status)
  values (v_referrer, v_user, 'pending');

  return jsonb_build_object('ok', true, 'status', 'pending');
end;
$$;

revoke all on function public.apply_referral_code(text) from public;
grant execute on function public.apply_referral_code(text) to authenticated;

-- Trusted server-side operation. Call only after confirmed, non-reversed,
-- eligible earnings are posted to the referred member's available wallet.
-- The qualification threshold and reward amount are configurable, not guessed.
create or replace function public.qualify_referral(p_referred_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.referrals%rowtype;
  v_threshold bigint;
  v_reward bigint;
  v_enabled boolean;
  v_total bigint;
  v_reward_id uuid;
  v_ledger_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  select qualification_threshold_coins, referrer_reward_coins, is_enabled
  into v_threshold, v_reward, v_enabled
  from public.referral_reward_config where id = true;

  if not coalesce(v_enabled, false) or coalesce(v_reward, 0) <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'referral_rewards_not_configured');
  end if;

  select * into v_referral
  from public.referrals
  where referred_user_id = p_referred_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'referral_not_found');
  end if;
  if v_referral.status in ('rewarded','rejected') then
    return jsonb_build_object('ok', true, 'status', v_referral.status, 'duplicate', true);
  end if;

  select coalesce(sum(amount_coins), 0) into v_total
  from public.wallet_ledger
  where user_id = p_referred_user_id
    and entry_type in ('reward_confirmed','bonus')
    and balance_bucket = 'available';

  if v_total < v_threshold then
    return jsonb_build_object('ok', true, 'status', 'pending', 'qualified', false);
  end if;

  update public.referrals
  set status = 'qualified', qualified_at = coalesce(qualified_at, now())
  where id = v_referral.id;

  -- Unique(referral_id, beneficiary_user_id) plus wallet ledger idempotency
  -- protects against retries and concurrent duplicate qualification calls.
  insert into public.referral_rewards(
    referral_id, beneficiary_user_id, reward_coins
  )
  values (v_referral.id, v_referral.referrer_user_id, v_reward)
  on conflict (referral_id, beneficiary_user_id) do nothing
  returning id into v_reward_id;

  if v_reward_id is null then
    update public.referrals set status = 'rewarded' where id = v_referral.id;
    return jsonb_build_object('ok', true, 'status', 'rewarded', 'duplicate', true);
  end if;

  insert into public.wallet_accounts(user_id, available_coins, lifetime_earned_coins)
  values (v_referral.referrer_user_id, 0, 0)
  on conflict (user_id) do nothing;

  update public.wallet_accounts
  set available_coins = available_coins + v_reward,
      lifetime_earned_coins = lifetime_earned_coins + v_reward,
      updated_at = now()
  where user_id = v_referral.referrer_user_id;

  insert into public.wallet_ledger(
    user_id, entry_type, amount_coins, balance_bucket,
    reference_type, reference_id, idempotency_key, description
  )
  values (
    v_referral.referrer_user_id, 'referral_reward', v_reward, 'available',
    'referral', v_referral.id::text,
    'referral:' || v_referral.id::text || ':referrer',
    'Referral qualification reward'
  )
  on conflict (idempotency_key) do nothing
  returning id into v_ledger_id;

  update public.referral_rewards
  set ledger_id = v_ledger_id
  where id = v_reward_id;

  update public.referrals set status = 'rewarded' where id = v_referral.id;

  return jsonb_build_object(
    'ok', true, 'status', 'rewarded',
    'reward_coins', v_reward, 'ledger_id', v_ledger_id
  );
end;
$$;

revoke all on function public.qualify_referral(uuid) from public, anon, authenticated;
grant execute on function public.qualify_referral(uuid) to service_role;

-- Members can see only referrals they initiated, never other users' personal data.
alter table public.referrals enable row level security;
drop policy if exists referrals_read_own_as_referrer on public.referrals;
create policy referrals_read_own_as_referrer
on public.referrals for select to authenticated
using (referrer_user_id = auth.uid());

alter table public.referral_rewards enable row level security;
drop policy if exists referral_rewards_read_own on public.referral_rewards;
create policy referral_rewards_read_own
on public.referral_rewards for select to authenticated
using (beneficiary_user_id = auth.uid());

commit;
