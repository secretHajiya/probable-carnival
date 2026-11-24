-- Vyra Rewards Global — Step 15: daily check-in reward posting
-- Server-side only; no client can directly edit wallets or check-in rows.
begin;

create table if not exists public.daily_checkin_config (
  id boolean primary key default true check (id = true),
  is_enabled boolean not null default false,
  reward_coins bigint not null default 0 check (reward_coins >= 0),
  timezone_name text not null default 'UTC',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.daily_checkin_config(id,is_enabled,reward_coins,timezone_name)
values (true,false,0,'UTC')
on conflict (id) do nothing;

alter table public.daily_checkin_config enable row level security;
revoke all on public.daily_checkin_config from anon, authenticated;
grant select on public.daily_checkin_config to authenticated;
create policy "Admins read daily checkin config" on public.daily_checkin_config
for select to authenticated using (public.is_active_admin());

create or replace function public.claim_daily_checkin()
returns table (
  checkin_id uuid,
  checkin_date date,
  streak_day integer,
  reward_coins bigint,
  available_coins bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_config public.daily_checkin_config%rowtype;
  v_local_date date;
  v_previous_streak integer;
  v_new_streak integer;
  v_wallet public.wallet_accounts%rowtype;
  v_checkin_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;

  select * into v_config
  from public.daily_checkin_config
  where id = true;

  if not found or not v_config.is_enabled or v_config.reward_coins <= 0 then
    raise exception 'daily_checkin_disabled';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user and status = 'active'
  ) then
    raise exception 'active_account_required';
  end if;

  v_local_date := (now() at time zone v_config.timezone_name)::date;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || v_local_date::text,0));

  if exists (
    select 1 from public.daily_checkins
    where user_id = v_user and checkin_date = v_local_date
  ) then
    raise exception 'already_checked_in_today';
  end if;

  select coalesce((
    select streak_day from public.daily_checkins
    where user_id = v_user and checkin_date = v_local_date - 1
    order by created_at desc limit 1
  ),0) into v_previous_streak;

  v_new_streak := case when v_previous_streak > 0 then v_previous_streak + 1 else 1 end;

  insert into public.daily_checkins(user_id,checkin_date,streak_day,reward_coins)
  values (v_user,v_local_date,v_new_streak,v_config.reward_coins)
  returning id into v_checkin_id;

  insert into public.wallet_ledger(
    user_id,entry_type,amount_coins,balance_bucket,reference_type,
    reference_id,idempotency_key,description,created_by
  ) values (
    v_user,'bonus',v_config.reward_coins,'available','daily_checkin',
    v_checkin_id::text,'daily-checkin:' || v_user::text || ':' || v_local_date::text,
    'Daily check-in reward',v_user
  );

  update public.wallet_accounts
  set available_coins = available_coins + v_config.reward_coins,
      lifetime_earned_coins = lifetime_earned_coins + v_config.reward_coins,
      updated_at = now()
  where user_id = v_user
  returning * into v_wallet;

  if not found then raise exception 'wallet_account_missing'; end if;

  return query select v_checkin_id,v_local_date,v_new_streak,
                      v_config.reward_coins,v_wallet.available_coins;
end;
$$;

revoke all on function public.claim_daily_checkin() from public, anon;
grant execute on function public.claim_daily_checkin() to authenticated;

commit;
