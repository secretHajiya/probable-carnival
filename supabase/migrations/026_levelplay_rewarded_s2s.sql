-- Vyra Rewards Global
-- Migration 026: LevelPlay rewarded-ad S2S verification and idempotent wallet credit.
-- Default disabled. Does not change CPX, withdrawals, Spin & Win, or Quiz settings.

begin;

create table if not exists public.levelplay_reward_config (
  id boolean primary key default true check (id = true),
  is_enabled boolean not null default false,
  app_key text,
  placement_name text,
  expected_reward_amount integer not null default 0 check (expected_reward_amount >= 0),
  coins_per_reward bigint not null default 0 check (coins_per_reward >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint levelplay_config_app_key_length check (app_key is null or length(app_key) between 1 and 160),
  constraint levelplay_config_placement_length check (placement_name is null or length(placement_name) between 1 and 160),
  constraint levelplay_config_enabled_values check (
    not is_enabled or (app_key is not null and placement_name is not null
      and expected_reward_amount > 0 and coins_per_reward > 0)
  )
);

insert into public.levelplay_reward_config(id, is_enabled, expected_reward_amount, coins_per_reward)
values (true, false, 0, 0)
on conflict (id) do nothing;

create table if not exists public.levelplay_reward_events (
  event_id text primary key,
  user_id uuid not null references auth.users(id),
  reward_amount integer not null check (reward_amount > 0),
  coins_credited bigint not null check (coins_credited > 0),
  app_key text not null,
  placement_name text not null,
  callback_timestamp text not null,
  callback_payload jsonb not null default '{}'::jsonb,
  ledger_id uuid references public.wallet_ledger(id),
  processed_at timestamptz not null default now(),
  constraint levelplay_event_id_format check (event_id ~ '^[A-Za-z0-9_-]{1,128}$')
);

create index if not exists levelplay_reward_events_user_processed_idx
  on public.levelplay_reward_events(user_id, processed_at desc);

alter table public.levelplay_reward_config enable row level security;
alter table public.levelplay_reward_events enable row level security;
revoke all on public.levelplay_reward_config, public.levelplay_reward_events from anon, authenticated;
grant select on public.levelplay_reward_config to service_role;
grant select, insert, update on public.levelplay_reward_events to service_role;

create or replace function public.admin_get_levelplay_reward_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;
  select pg_catalog.jsonb_build_object(
    'is_enabled', c.is_enabled,
    'app_key', c.app_key,
    'placement_name', c.placement_name,
    'expected_reward_amount', c.expected_reward_amount,
    'coins_per_reward', c.coins_per_reward,
    'updated_at', c.updated_at
  ) into v_result
  from public.levelplay_reward_config c where c.id = true;
  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function public.admin_update_levelplay_reward_config(
  p_is_enabled boolean,
  p_app_key text,
  p_placement_name text,
  p_expected_reward_amount integer,
  p_coins_per_reward bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_app_key text := nullif(pg_catalog.btrim(coalesce(p_app_key,'')), '');
  v_placement text := nullif(pg_catalog.btrim(coalesce(p_placement_name,'')), '');
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;
  if coalesce(p_is_enabled,false) and (v_app_key is null or v_placement is null
      or coalesce(p_expected_reward_amount,0) <= 0 or coalesce(p_coins_per_reward,0) <= 0) then
    raise exception 'configure app key, placement, expected reward amount and coin reward before enabling';
  end if;
  if length(coalesce(v_app_key,'')) > 160 or length(coalesce(v_placement,'')) > 160 then
    raise exception 'LevelPlay configuration value is too long';
  end if;
  if coalesce(p_expected_reward_amount,0) < 0 or coalesce(p_coins_per_reward,0) < 0 then
    raise exception 'reward values cannot be negative';
  end if;
  select pg_catalog.to_jsonb(c) into v_before from public.levelplay_reward_config c where c.id=true for update;
  insert into public.levelplay_reward_config(
    id,is_enabled,app_key,placement_name,expected_reward_amount,coins_per_reward,updated_at,updated_by
  ) values (
    true,coalesce(p_is_enabled,false),v_app_key,v_placement,
    coalesce(p_expected_reward_amount,0),coalesce(p_coins_per_reward,0),pg_catalog.now(),auth.uid()
  ) on conflict(id) do update set
    is_enabled=excluded.is_enabled,app_key=excluded.app_key,placement_name=excluded.placement_name,
    expected_reward_amount=excluded.expected_reward_amount,coins_per_reward=excluded.coins_per_reward,
    updated_at=pg_catalog.now(),updated_by=auth.uid();
  select pg_catalog.to_jsonb(c) into v_after from public.levelplay_reward_config c where c.id=true;
  insert into public.admin_audit_logs(actor_user_id,action,target_type,target_id,before_data,after_data)
  values(auth.uid(),'levelplay_reward_config_update','levelplay_reward_config','singleton',v_before,v_after);
end;
$$;

create or replace function public.process_levelplay_reward(
  p_event_id text,
  p_user_id uuid,
  p_reward_amount integer,
  p_app_key text,
  p_placement_name text,
  p_callback_timestamp text,
  p_callback_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config public.levelplay_reward_config%rowtype;
  v_profile public.profiles%rowtype;
  v_event_inserted text;
  v_coins bigint;
  v_ledger_id uuid;
  v_balance bigint;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service role required' using errcode='42501';
  end if;
  if p_event_id is null or p_event_id !~ '^[A-Za-z0-9_-]{1,128}$'
      or p_user_id is null or coalesce(p_reward_amount,0) <= 0
      or nullif(pg_catalog.btrim(coalesce(p_app_key,'')),'') is null
      or nullif(pg_catalog.btrim(coalesce(p_placement_name,'')),'') is null
      or nullif(pg_catalog.btrim(coalesce(p_callback_timestamp,'')),'') is null then
    raise exception 'invalid LevelPlay callback arguments';
  end if;

  -- A previously credited event must remain safely acknowledgeable after an admin disables ads.
  if exists(select 1 from public.levelplay_reward_events e where e.event_id=p_event_id and e.user_id=p_user_id) then
    return pg_catalog.jsonb_build_object('success',true,'duplicate',true,'credited',false,'event_id',p_event_id);
  end if;

  select * into v_config from public.levelplay_reward_config where id=true for share;
  if not found or not v_config.is_enabled then
    raise exception 'levelplay_rewards_disabled';
  end if;
  if p_app_key <> v_config.app_key or p_placement_name <> v_config.placement_name
      or p_reward_amount <> v_config.expected_reward_amount then
    raise exception 'levelplay_callback_configuration_mismatch';
  end if;

  select * into v_profile from public.profiles where id=p_user_id for share;
  if not found or v_profile.status <> 'active' or v_profile.country_code is null then
    raise exception 'levelplay_member_not_eligible';
  end if;
  if not exists (
    select 1 from public.country_settings c
    join public.countries x on x.code=c.country_code
    where c.country_code=v_profile.country_code and c.is_enabled and x.is_enabled
  ) then
    raise exception 'levelplay_member_country_disabled';
  end if;

  v_coins := v_config.coins_per_reward;
  insert into public.levelplay_reward_events(
    event_id,user_id,reward_amount,coins_credited,app_key,placement_name,
    callback_timestamp,callback_payload
  ) values (
    p_event_id,p_user_id,p_reward_amount,v_coins,p_app_key,p_placement_name,
    p_callback_timestamp,coalesce(p_callback_payload,'{}'::jsonb)
  ) on conflict(event_id) do nothing returning event_id into v_event_inserted;

  if v_event_inserted is null then
    if exists(select 1 from public.levelplay_reward_events e where e.event_id=p_event_id and e.user_id=p_user_id) then
      return pg_catalog.jsonb_build_object('success',true,'duplicate',true,'credited',false,'event_id',p_event_id);
    end if;
    raise exception 'levelplay_event_id_conflict';
  end if;

  insert into public.wallet_accounts(user_id) values(p_user_id) on conflict(user_id) do nothing;
  update public.wallet_accounts
    set available_coins=available_coins+v_coins,
        lifetime_earned_coins=lifetime_earned_coins+v_coins,
        updated_at=pg_catalog.now()
    where user_id=p_user_id returning available_coins into v_balance;
  if not found then raise exception 'wallet_account_missing'; end if;

  insert into public.wallet_ledger(
    user_id,entry_type,amount_coins,balance_bucket,reference_type,reference_id,
    idempotency_key,description,created_by
  ) values (
    p_user_id,'bonus',v_coins,'available','levelplay_rewarded_ad',p_event_id,
    'levelplay:'||p_event_id,'Verified Unity LevelPlay rewarded ad',p_user_id
  ) returning id into v_ledger_id;

  update public.levelplay_reward_events set ledger_id=v_ledger_id where event_id=p_event_id;
  return pg_catalog.jsonb_build_object(
    'success',true,'credited',true,'duplicate',false,'event_id',p_event_id,
    'coins_credited',v_coins,'available_balance',v_balance,'ledger_id',v_ledger_id
  );
end;
$$;

revoke all on function public.admin_get_levelplay_reward_config() from public,anon;
revoke all on function public.admin_update_levelplay_reward_config(boolean,text,text,integer,bigint) from public,anon;
revoke all on function public.process_levelplay_reward(text,uuid,integer,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_get_levelplay_reward_config() to authenticated;
grant execute on function public.admin_update_levelplay_reward_config(boolean,text,text,integer,bigint) to authenticated;
grant execute on function public.process_levelplay_reward(text,uuid,integer,text,text,text,jsonb) to service_role;

commit;
