-- Vyra Rewards Global — Supabase initial schema
-- Development migration 001
-- Run in Supabase Dashboard > SQL Editor.
-- This migration creates the database foundation only. It does not enable real payouts.

begin;

create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
do $$ begin
  create type public.account_status as enum ('active','suspended','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ledger_entry_type as enum (
    'reward_pending','reward_confirmed','reward_reversed',
    'withdrawal_reserved','withdrawal_paid','withdrawal_released',
    'referral_reward','admin_adjustment','bonus'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.withdrawal_status as enum (
    'requested','under_review','approved','processing','paid','rejected','cancelled','failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.provider_transaction_status as enum ('pending','approved','reversed','rejected');
exception when duplicate_object then null; end $$;

-- ---------- CORE USER DATA ----------
create table if not exists public.countries (
  code char(2) primary key,
  name text not null,
  currency_code char(3) not null,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.countries(code,name,currency_code,is_enabled)
values ('NG','Nigeria','NGN',true)
on conflict (code) do update set name=excluded.name, currency_code=excluded.currency_code;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  country_code char(2) references public.countries(code),
  preferred_language text not null default 'en',
  status public.account_status not null default 'active',
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_language_check check (preferred_language in ('en','ha'))
);

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('support','finance_reviewer','admin','super_admin')),
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- ---------- REWARD PROVIDERS ----------
create table if not exists public.reward_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.reward_providers(code,display_name,is_enabled)
values ('cpx','CPX Research',false)
on conflict (code) do nothing;

create table if not exists public.provider_apps (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.reward_providers(id),
  platform text not null check (platform in ('web','android','ios')),
  external_app_id text,
  country_code char(2) references public.countries(code),
  is_enabled boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider_id,platform,country_code)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.reward_providers(id),
  external_offer_id text,
  title text not null,
  description text,
  country_code char(2) references public.countries(code),
  reward_coins bigint not null default 0 check (reward_coins >= 0),
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Provider callbacks are retained for audit/idempotency.
create table if not exists public.provider_callbacks (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.reward_providers(id),
  external_transaction_id text not null,
  external_user_id text,
  internal_user_id uuid references auth.users(id),
  event_status text not null,
  payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  processed_at timestamptz,
  processing_result text,
  received_at timestamptz not null default now(),
  unique(provider_id,external_transaction_id,event_status)
);

create table if not exists public.offer_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  offer_id uuid references public.offers(id),
  provider_id uuid not null references public.reward_providers(id),
  external_transaction_id text not null,
  status public.provider_transaction_status not null default 'pending',
  gross_revenue_minor bigint not null default 0 check (gross_revenue_minor >= 0),
  revenue_currency char(3) not null default 'USD',
  reward_coins bigint not null default 0 check (reward_coins >= 0),
  country_code char(2) references public.countries(code),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider_id,external_transaction_id)
);

-- ---------- WALLET / LEDGER ----------
create table if not exists public.wallet_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_coins bigint not null default 0 check (available_coins >= 0),
  pending_coins bigint not null default 0 check (pending_coins >= 0),
  lifetime_earned_coins bigint not null default 0 check (lifetime_earned_coins >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  entry_type public.ledger_entry_type not null,
  amount_coins bigint not null check (amount_coins > 0),
  balance_bucket text not null check (balance_bucket in ('available','pending','reserved')),
  reference_type text not null,
  reference_id text not null,
  idempotency_key text not null unique,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_user_created_idx
  on public.wallet_ledger(user_id,created_at desc);
create index if not exists offer_completions_user_created_idx
  on public.offer_completions(user_id,created_at desc);

-- ---------- WITHDRAWALS ----------
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  country_code char(2) not null references public.countries(code),
  payout_method text not null check (payout_method in ('bank_transfer')),
  amount_coins bigint not null check (amount_coins > 0),
  amount_minor bigint not null check (amount_minor > 0),
  currency_code char(3) not null,
  fee_minor bigint not null default 0 check (fee_minor >= 0),
  status public.withdrawal_status not null default 'requested',
  payout_details_token text,
  user_note text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  paid_at timestamptz,
  payout_reference text,
  rejection_reason text,
  updated_at timestamptz not null default now()
);

create index if not exists withdrawal_user_created_idx
  on public.withdrawal_requests(user_id,requested_at desc);
create index if not exists withdrawal_status_created_idx
  on public.withdrawal_requests(status,requested_at);

create table if not exists public.withdrawal_reviews (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references public.withdrawal_requests(id),
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','rejected','needs_info')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.payout_records (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null unique references public.withdrawal_requests(id),
  provider_name text,
  provider_reference text,
  amount_minor bigint not null check (amount_minor > 0),
  currency_code char(3) not null,
  status text not null check (status in ('initiated','succeeded','failed','reconciled')),
  proof_reference text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- REFERRALS ----------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id),
  referred_user_id uuid not null unique references auth.users(id),
  status text not null default 'pending' check (status in ('pending','qualified','rewarded','rejected')),
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_user_id <> referred_user_id)
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id),
  beneficiary_user_id uuid not null references auth.users(id),
  reward_coins bigint not null check (reward_coins > 0),
  ledger_id uuid references public.wallet_ledger(id),
  created_at timestamptz not null default now(),
  unique(referral_id,beneficiary_user_id)
);

-- ---------- COUNTRY ECONOMICS / SETTINGS ----------
create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  currency_code char(3) not null,
  coins_per_major_unit bigint not null check (coins_per_major_unit > 0),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  source text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.reward_rules (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) references public.countries(code),
  provider_id uuid references public.reward_providers(id),
  rule_name text not null,
  coins_per_revenue_major_unit bigint not null check (coins_per_revenue_major_unit > 0),
  is_active boolean not null default false,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- ---------- ENGAGEMENT / SUPPORT / AUDIT ----------
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  checkin_date date not null,
  streak_day integer not null default 1 check (streak_day > 0),
  reward_coins bigint not null default 0 check (reward_coins >= 0),
  created_at timestamptz not null default now(),
  unique(user_id,checkin_date)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null,
  body text not null,
  category text not null default 'general',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fraud_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  reason_code text not null,
  risk_score integer check (risk_score between 0 and 100),
  status text not null default 'pending' check (status in ('pending','reviewing','cleared','restricted')),
  reviewer_id uuid references auth.users(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- ---------- UPDATED_AT + NEW USER ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.profiles(id,display_name,referral_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''), v_code)
  on conflict (id) do nothing;

  insert into public.wallet_accounts(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------- SECURITY HELPERS ----------
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_roles ar
    where ar.user_id = (select auth.uid())
      and ar.is_active = true
      and ar.role in ('support','finance_reviewer','admin','super_admin')
  );
$$;

create or replace function public.is_finance_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_roles ar
    where ar.user_id = (select auth.uid())
      and ar.is_active = true
      and ar.role in ('finance_reviewer','admin','super_admin')
  );
$$;

-- ---------- RLS ----------
alter table public.countries enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.reward_providers enable row level security;
alter table public.provider_apps enable row level security;
alter table public.offers enable row level security;
alter table public.provider_callbacks enable row level security;
alter table public.offer_completions enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.withdrawal_reviews enable row level security;
alter table public.payout_records enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.reward_rules enable row level security;
alter table public.system_settings enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.fraud_reviews enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Public/read-only reference data.
create policy "Enabled countries readable" on public.countries
for select to authenticated using (is_enabled = true or public.is_active_admin());

create policy "Enabled providers readable" on public.reward_providers
for select to authenticated using (is_enabled = true or public.is_active_admin());

create policy "Enabled provider apps readable" on public.provider_apps
for select to authenticated using (is_enabled = true or public.is_active_admin());

create policy "Active offers readable" on public.offers
for select to authenticated using (is_active = true or public.is_active_admin());

create policy "Exchange rates readable" on public.exchange_rates
for select to authenticated using (true);

create policy "Active reward rules readable" on public.reward_rules
for select to authenticated using (is_active = true or public.is_active_admin());

-- User-owned data.
create policy "Users read own profile" on public.profiles
for select to authenticated using (id = (select auth.uid()) or public.is_active_admin());

create policy "Users update own profile" on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Users read own wallet" on public.wallet_accounts
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());

create policy "Users read own ledger" on public.wallet_ledger
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());

create policy "Users read own offer completions" on public.offer_completions
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());

create policy "Users read own withdrawals" on public.withdrawal_requests
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());

create policy "Users read own referrals" on public.referrals
for select to authenticated using (
  referrer_user_id = (select auth.uid())
  or referred_user_id = (select auth.uid())
  or public.is_active_admin()
);

create policy "Users read own referral rewards" on public.referral_rewards
for select to authenticated using (beneficiary_user_id = (select auth.uid()) or public.is_active_admin());

create policy "Users read own checkins" on public.daily_checkins
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());

create policy "Users read own notifications" on public.notifications
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());

create policy "Users update own notification read state" on public.notifications
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users read own support tickets" on public.support_tickets
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());

create policy "Users create own support tickets" on public.support_tickets
for insert to authenticated with check (user_id = (select auth.uid()));

-- Restricted admin visibility.
create policy "Admins read roles" on public.admin_roles
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());

create policy "Finance admins read withdrawal reviews" on public.withdrawal_reviews
for select to authenticated using (public.is_finance_admin());

create policy "Finance admins read payout records" on public.payout_records
for select to authenticated using (public.is_finance_admin());

create policy "Admins read fraud reviews" on public.fraud_reviews
for select to authenticated using (public.is_active_admin());

create policy "Admins read audit logs" on public.admin_audit_logs
for select to authenticated using (public.is_active_admin());

create policy "Admins read provider callbacks" on public.provider_callbacks
for select to authenticated using (public.is_active_admin());

create policy "Admins read system settings" on public.system_settings
for select to authenticated using (public.is_active_admin());

-- Restrict which columns a signed-in user can modify.
-- RLS controls rows; column grants prevent profile privilege escalation.
revoke update on public.profiles from authenticated;
grant update(display_name, preferred_language) on public.profiles to authenticated;

revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;

-- Deliberately no client INSERT/UPDATE/DELETE policies for:
-- wallet_accounts, wallet_ledger, provider_callbacks, offer_completions,
-- withdrawal_reviews, payout_records, referral_rewards, admin_roles,
-- fraud_reviews, admin_audit_logs, reward_rules, provider configuration.
-- Trusted Edge Functions / service-role operations will perform those actions.

commit;

-- IMPORTANT NEXT SECURITY TASKS (not part of this migration):
-- 1. Create the first super_admin using a controlled server-side process.
-- 2. Re-check column grants and add a safe profile-update RPC before production.
-- 3. Add Edge Functions with CPX signature verification, IP checks and idempotency.
-- 4. Add wallet posting/reservation/reversal functions with row locks and reconciliation.
-- 5. Store provider secrets only in Supabase Vault / Edge Function secrets.
-- 6. Review RLS policies and test with separate user/admin accounts before real data.
