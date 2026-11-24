-- Migration 029: isolated, audited exchange-rate proposals.
-- These drafts are deliberately NOT read by payout, wallet, reward, or member RPCs.
-- No live exchange_rates rows are inserted or updated by this migration.
begin;

create table if not exists public.exchange_rate_drafts (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  currency_code char(3) not null,
  coins_per_major_unit bigint not null check (coins_per_major_unit > 0),
  rationale text not null check (length(trim(rationale)) between 5 and 500),
  status text not null default 'pending' check (status = 'pending'),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_code, currency_code)
);

alter table public.exchange_rate_drafts enable row level security;
revoke all on public.exchange_rate_drafts from anon, authenticated;

create or replace function public.admin_list_exchange_rate_drafts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'configuration admin access required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'drafts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'country_code', d.country_code, 'country_name', c.name,
        'currency_code', d.currency_code, 'coins_per_major_unit', d.coins_per_major_unit,
        'rationale', d.rationale, 'status', d.status,
        'created_at', d.created_at, 'updated_at', d.updated_at
      ) order by d.updated_at desc)
      from public.exchange_rate_drafts d join public.countries c on c.code = d.country_code
    ), '[]'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'country_code', cs.country_code, 'country_name', cs.country_name,
        'default_currency_code', cs.default_currency_code, 'is_enabled', cs.is_enabled
      ) order by cs.country_code)
      from public.country_settings cs
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_save_exchange_rate_draft(
  p_country_code text,
  p_currency_code text,
  p_coins_per_major_unit bigint,
  p_rationale text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_country text := upper(trim(coalesce(p_country_code, '')));
  v_currency text := upper(trim(coalesce(p_currency_code, '')));
  v_before jsonb;
  v_after jsonb;
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'configuration admin access required' using errcode = '42501';
  end if;
  if v_country !~ '^[A-Z]{2}$' or v_currency !~ '^[A-Z]{3}$'
     or p_coins_per_major_unit is null or p_coins_per_major_unit <= 0
     or length(trim(coalesce(p_rationale, ''))) not between 5 and 500 then
    raise exception 'invalid exchange rate proposal';
  end if;
  if not exists (
    select 1 from public.country_settings cs
    join public.currency_settings cu on cu.currency_code = cs.default_currency_code
    where cs.country_code = v_country and cs.default_currency_code = v_currency
      and cs.is_enabled = true and cu.is_enabled = true
  ) then
    raise exception 'enabled country and its enabled default currency are required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(74102, 24);
  select to_jsonb(d) into v_before
  from public.exchange_rate_drafts d
  where d.country_code = v_country::char(2) and d.currency_code = v_currency::char(3)
  for update;

  insert into public.exchange_rate_drafts(
    country_code, currency_code, coins_per_major_unit, rationale, created_by, updated_by
  ) values (
    v_country::char(2), v_currency::char(3), p_coins_per_major_unit,
    trim(p_rationale), auth.uid(), auth.uid()
  )
  on conflict(country_code, currency_code) do update set
    coins_per_major_unit = excluded.coins_per_major_unit,
    rationale = excluded.rationale,
    updated_by = auth.uid(),
    updated_at = now();

  select to_jsonb(d) into v_after from public.exchange_rate_drafts d
  where d.country_code = v_country::char(2) and d.currency_code = v_currency::char(3);

  insert into public.admin_audit_logs(actor_user_id, action, target_type, target_id, before_data, after_data)
  values(auth.uid(), 'exchange_rate_draft_upsert', 'exchange_rate_draft', v_country || ':' || v_currency, v_before, v_after);
end;
$$;

revoke all on function public.admin_list_exchange_rate_drafts() from public, anon;
revoke all on function public.admin_save_exchange_rate_draft(text, text, bigint, text) from public, anon;
grant execute on function public.admin_list_exchange_rate_drafts() to authenticated;
grant execute on function public.admin_save_exchange_rate_draft(text, text, bigint, text) to authenticated;

commit;
