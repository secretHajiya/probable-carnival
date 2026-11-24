-- Vyra Rewards Global — Migration 024: Secure Spin & Win
-- Apply manually in Supabase SQL Editor after reviewing this migration.
-- Default is disabled. No withdrawal settings are changed.
begin;

create table if not exists public.spin_wheel_config (
  id boolean primary key default true check (id = true),
  is_enabled boolean not null default false,
  daily_free_spins integer not null default 1 check (daily_free_spins between 1 and 10),
  segments jsonb not null default '[
    {"key":"coins_10","label":"10 Coins","coins":10,"weight":35,"active":true},
    {"key":"coins_25","label":"25 Coins","coins":25,"weight":25,"active":true},
    {"key":"coins_50","label":"50 Coins","coins":50,"weight":18,"active":true},
    {"key":"coins_100","label":"100 Coins","coins":100,"weight":12,"active":true},
    {"key":"coins_250","label":"250 Coins","coins":250,"weight":7,"active":true},
    {"key":"coins_500","label":"500 Coins","coins":500,"weight":3,"active":true}
  ]'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.spin_wheel_config(id,is_enabled,daily_free_spins)
values (true,false,1)
on conflict (id) do nothing;

create table if not exists public.spin_wheel_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spin_date date not null,
  spin_number integer not null check (spin_number > 0),
  segment_key text not null,
  reward_label text not null,
  reward_coins bigint not null check (reward_coins >= 0),
  created_at timestamptz not null default now(),
  unique(user_id,spin_date,spin_number)
);

create index if not exists spin_wheel_spins_user_created_idx
  on public.spin_wheel_spins(user_id,created_at desc);

alter table public.spin_wheel_config enable row level security;
alter table public.spin_wheel_spins enable row level security;

revoke all on public.spin_wheel_config from anon,authenticated;
revoke all on public.spin_wheel_spins from anon,authenticated;
grant select on public.spin_wheel_config to authenticated;
grant select on public.spin_wheel_spins to authenticated;

drop policy if exists "Members read enabled spin wheel config" on public.spin_wheel_config;
create policy "Members read enabled spin wheel config" on public.spin_wheel_config
for select to authenticated using (is_enabled = true or public.is_active_admin());

drop policy if exists "Members read own spin history" on public.spin_wheel_spins;
create policy "Members read own spin history" on public.spin_wheel_spins
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());

create or replace function public.spin_wheel()
returns table (
  spin_id uuid,
  reward_key text,
  reward_label text,
  reward_coins bigint,
  spins_remaining integer,
  available_coins bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_config public.spin_wheel_config%rowtype;
  v_timezone text;
  v_spin_date date;
  v_used integer;
  v_spin_number integer;
  v_total_weight bigint := 0;
  v_roll bigint;
  v_running bigint := 0;
  v_segment jsonb;
  v_selected jsonb;
  v_reward_coins bigint;
  v_spin_id uuid;
  v_wallet public.wallet_accounts%rowtype;
begin
  if v_user is null then raise exception 'authentication_required'; end if;

  select * into v_profile from public.profiles where id = v_user;
  if not found or v_profile.status <> 'active' then
    raise exception 'active_account_required';
  end if;

  select * into v_config from public.spin_wheel_config where id = true;
  if not found or not v_config.is_enabled then
    raise exception 'spin_wheel_disabled';
  end if;

  v_timezone := case upper(coalesce(v_profile.country_code::text,'NG'))
    when 'NG' then 'Africa/Lagos'
    when 'US' then 'America/New_York'
    else 'UTC'
  end;
  v_spin_date := (now() at time zone v_timezone)::date;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':spin-wheel:' || v_spin_date::text,0));

  select count(*)::integer into v_used
  from public.spin_wheel_spins
  where user_id = v_user and spin_date = v_spin_date;

  if v_used >= v_config.daily_free_spins then
    raise exception 'no_spins_remaining';
  end if;

  if jsonb_typeof(v_config.segments) <> 'array' then
    raise exception 'spin_wheel_configuration_invalid';
  end if;

  for v_segment in select value from jsonb_array_elements(v_config.segments)
  loop
    if coalesce((v_segment->>'active')::boolean,false)
       and coalesce((v_segment->>'weight')::bigint,0) > 0
       and coalesce((v_segment->>'coins')::bigint,-1) >= 0
       and nullif(v_segment->>'key','') is not null
       and nullif(v_segment->>'label','') is not null then
      v_total_weight := v_total_weight + (v_segment->>'weight')::bigint;
    end if;
  end loop;

  if v_total_weight <= 0 then raise exception 'spin_wheel_configuration_invalid'; end if;

  v_roll := floor(random() * v_total_weight)::bigint + 1;
  for v_segment in select value from jsonb_array_elements(v_config.segments)
  loop
    if coalesce((v_segment->>'active')::boolean,false)
       and coalesce((v_segment->>'weight')::bigint,0) > 0
       and coalesce((v_segment->>'coins')::bigint,-1) >= 0
       and nullif(v_segment->>'key','') is not null
       and nullif(v_segment->>'label','') is not null then
      v_running := v_running + (v_segment->>'weight')::bigint;
      if v_roll <= v_running then
        v_selected := v_segment;
        exit;
      end if;
    end if;
  end loop;

  v_reward_coins := (v_selected->>'coins')::bigint;
  v_spin_number := v_used + 1;

  insert into public.spin_wheel_spins(
    user_id,spin_date,spin_number,segment_key,reward_label,reward_coins
  ) values (
    v_user,v_spin_date,v_spin_number,v_selected->>'key',v_selected->>'label',v_reward_coins
  ) returning id into v_spin_id;

  if v_reward_coins > 0 then
    insert into public.wallet_ledger(
      user_id,entry_type,amount_coins,balance_bucket,reference_type,
      reference_id,idempotency_key,description,created_by
    ) values (
      v_user,'bonus',v_reward_coins,'available','spin_wheel',v_spin_id::text,
      'spin-wheel:' || v_spin_id::text,'Spin & Win: ' || (v_selected->>'label'),v_user
    );

    update public.wallet_accounts
    set available_coins = available_coins + v_reward_coins,
        lifetime_earned_coins = lifetime_earned_coins + v_reward_coins,
        updated_at = now()
    where user_id = v_user
    returning * into v_wallet;

    if not found then raise exception 'wallet_account_missing'; end if;
  else
    select * into v_wallet from public.wallet_accounts where user_id = v_user;
    if not found then raise exception 'wallet_account_missing'; end if;
  end if;

  return query select v_spin_id,v_selected->>'key',v_selected->>'label',v_reward_coins,
    greatest(v_config.daily_free_spins - v_spin_number,0),v_wallet.available_coins;
end;
$$;

create or replace function public.admin_update_spin_wheel_config(
  p_is_enabled boolean,
  p_daily_free_spins integer,
  p_segments jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_count integer := 0;
  v_total_weight bigint := 0;
begin
  if not public.is_active_admin() then raise exception 'admin_access_required'; end if;
  if p_daily_free_spins is null or p_daily_free_spins < 1 or p_daily_free_spins > 10 then
    raise exception 'daily_free_spins_out_of_range';
  end if;
  if jsonb_typeof(p_segments) <> 'array' or jsonb_array_length(p_segments) < 2 or jsonb_array_length(p_segments) > 16 then
    raise exception 'spin_segments_invalid';
  end if;

  for v_item in select value from jsonb_array_elements(p_segments)
  loop
    v_count := v_count + 1;
    if nullif(v_item->>'key','') is null or length(v_item->>'key') > 64
       or nullif(v_item->>'label','') is null or length(v_item->>'label') > 48
       or coalesce((v_item->>'coins')::bigint,-1) < 0
       or coalesce((v_item->>'coins')::bigint,0) > 1000000
       or coalesce((v_item->>'weight')::integer,0) < 0
       or coalesce((v_item->>'weight')::integer,0) > 100000
       or jsonb_typeof(v_item->'active') <> 'boolean' then
      raise exception 'spin_segment_invalid';
    end if;
    if (v_item->>'active')::boolean then
      v_total_weight := v_total_weight + (v_item->>'weight')::bigint;
    end if;
  end loop;
  if v_total_weight <= 0 then raise exception 'spin_segments_have_no_active_weight'; end if;

  update public.spin_wheel_config
  set is_enabled = p_is_enabled,
      daily_free_spins = p_daily_free_spins,
      segments = p_segments,
      updated_by = auth.uid(),
      updated_at = now()
  where id = true;
end;
$$;

revoke all on function public.spin_wheel() from public,anon;
grant execute on function public.spin_wheel() to authenticated;
revoke all on function public.admin_update_spin_wheel_config(boolean,integer,jsonb) from public,anon;
grant execute on function public.admin_update_spin_wheel_config(boolean,integer,jsonb) to authenticated;

commit;
