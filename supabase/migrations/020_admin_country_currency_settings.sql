-- Migration 020: audited admin country and currency configuration.
-- Does not configure FX rates or activate withdrawals / payouts.
begin;

create table if not exists public.country_settings (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  country_name text not null check (length(trim(country_name)) between 2 and 100),
  default_currency_code text not null check (default_currency_code ~ '^[A-Z]{3}$'),
  timezone_name text not null default 'UTC',
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.currency_settings (
  currency_code text primary key check (currency_code ~ '^[A-Z]{3}$'),
  currency_name text not null check (length(trim(currency_name)) between 2 and 100),
  minor_units smallint not null default 2 check (minor_units between 0 and 4),
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  setting_key text primary key check (setting_key ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  setting_value jsonb not null default '{}'::jsonb,
  description text not null default '',
  is_sensitive boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create index if not exists country_settings_enabled_idx on public.country_settings(is_enabled, country_code);
create index if not exists currency_settings_enabled_idx on public.currency_settings(is_enabled, currency_code);

-- Configuration writes are restricted to admin/super_admin, not the support role.
create or replace function public.is_configuration_admin()
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
      and ar.role in ('admin','super_admin')
  );
$$;
revoke all on function public.is_configuration_admin() from public, anon;
grant execute on function public.is_configuration_admin() to authenticated;

alter table public.country_settings enable row level security;
alter table public.currency_settings enable row level security;
alter table public.app_settings enable row level security;
revoke all on public.country_settings, public.currency_settings, public.app_settings from anon, authenticated;

-- Only the SECURITY DEFINER listing function can read these tables from the app.
drop policy if exists country_settings_admin_read on public.country_settings;
drop policy if exists currency_settings_admin_read on public.currency_settings;
drop policy if exists app_settings_admin_read on public.app_settings;

create or replace function public.admin_list_country_currency_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'countries', coalesce((select jsonb_agg(to_jsonb(c) order by c.country_code) from public.country_settings c), '[]'::jsonb),
    'currencies', coalesce((select jsonb_agg(to_jsonb(x) order by x.currency_code) from public.currency_settings x), '[]'::jsonb),
    'settings', coalesce((select jsonb_agg(jsonb_build_object('setting_key',s.setting_key,'setting_value',s.setting_value,'description',s.description,'updated_at',s.updated_at) order by s.setting_key) from public.app_settings s where not s.is_sensitive), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_upsert_country_setting(
  p_country_code text, p_country_name text, p_default_currency_code text,
  p_timezone_name text default 'UTC', p_is_enabled boolean default false
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_code text := upper(trim(p_country_code)); v_currency text := upper(trim(p_default_currency_code)); v_before jsonb;
begin
  if auth.uid() is null or not public.is_configuration_admin() then raise exception 'admin access required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(74102, 1);
  if coalesce(v_code,'') !~ '^[A-Z]{2}$' or coalesce(v_currency,'') !~ '^[A-Z]{3}$' or length(trim(coalesce(p_country_name,''))) not between 2 and 100 then raise exception 'invalid country or currency details'; end if;
  if p_timezone_name is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone_name) then raise exception 'unknown timezone'; end if;
  if not exists(select 1 from public.currency_settings where currency_code=v_currency) then raise exception 'default currency must be configured first'; end if;
  if coalesce(p_is_enabled,false) and not exists(select 1 from public.currency_settings where currency_code=v_currency and is_enabled) then raise exception 'default currency must be enabled first'; end if;
  select to_jsonb(c) into v_before from public.country_settings c where c.country_code=v_code for update;
  insert into public.country_settings(country_code,country_name,default_currency_code,timezone_name,is_enabled)
  values(v_code,trim(p_country_name),v_currency,p_timezone_name,coalesce(p_is_enabled,false))
  on conflict(country_code) do update set country_name=excluded.country_name,default_currency_code=excluded.default_currency_code,timezone_name=excluded.timezone_name,is_enabled=excluded.is_enabled,updated_at=now();
  insert into public.countries(code,name,currency_code,is_enabled)
  values(v_code::char(2),trim(p_country_name),v_currency::char(3),coalesce(p_is_enabled,false))
  on conflict(code) do update set name=excluded.name,currency_code=excluded.currency_code,is_enabled=excluded.is_enabled;
  if not coalesce(p_is_enabled,false) then
    update public.provider_apps set is_enabled=false where country_code=v_code::char(2);
  end if;
  insert into public.admin_audit_logs(actor_user_id,action,target_type,target_id,before_data,after_data)
  values(auth.uid(),'country_setting_upsert','country',v_code,v_before,jsonb_build_object('country_name',trim(p_country_name),'default_currency_code',v_currency,'timezone_name',p_timezone_name,'is_enabled',coalesce(p_is_enabled,false)));
end;
$$;

create or replace function public.admin_upsert_currency_setting(
  p_currency_code text, p_currency_name text, p_minor_units smallint default 2, p_is_enabled boolean default false
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_code text := upper(trim(p_currency_code)); v_before jsonb;
begin
  if auth.uid() is null or not public.is_configuration_admin() then raise exception 'admin access required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(74102, 1);
  if coalesce(v_code,'') !~ '^[A-Z]{3}$' or length(trim(coalesce(p_currency_name,''))) not between 2 and 100 or p_minor_units is null or p_minor_units not between 0 and 4 then raise exception 'invalid currency details'; end if;
  if not coalesce(p_is_enabled,false) and exists(select 1 from public.country_settings where default_currency_code=v_code and is_enabled) then raise exception 'currency is the default for an enabled country'; end if;
  select to_jsonb(c) into v_before from public.currency_settings c where c.currency_code=v_code for update;
  insert into public.currency_settings(currency_code,currency_name,minor_units,is_enabled)
  values(v_code,trim(p_currency_name),p_minor_units,coalesce(p_is_enabled,false))
  on conflict(currency_code) do update set currency_name=excluded.currency_name,minor_units=excluded.minor_units,is_enabled=excluded.is_enabled,updated_at=now();
  insert into public.admin_audit_logs(actor_user_id,action,target_type,target_id,before_data,after_data)
  values(auth.uid(),'currency_setting_upsert','currency',v_code,v_before,jsonb_build_object('currency_name',trim(p_currency_name),'minor_units',p_minor_units,'is_enabled',coalesce(p_is_enabled,false)));
end;
$$;

revoke all on function public.admin_list_country_currency_settings() from public, anon;
revoke all on function public.admin_upsert_country_setting(text,text,text,text,boolean) from public, anon;
revoke all on function public.admin_upsert_currency_setting(text,text,smallint,boolean) from public, anon;
grant execute on function public.admin_list_country_currency_settings() to authenticated;
grant execute on function public.admin_upsert_country_setting(text,text,text,text,boolean) to authenticated;
grant execute on function public.admin_upsert_currency_setting(text,text,smallint,boolean) to authenticated;

insert into public.currency_settings(currency_code,currency_name,minor_units,is_enabled)
values('NGN','Nigerian Naira',2,false) on conflict(currency_code) do nothing;
insert into public.country_settings(country_code,country_name,default_currency_code,timezone_name,is_enabled)
values('NG','Nigeria','NGN','Africa/Lagos',false) on conflict(country_code) do nothing;

-- Keep the operational country table used by member eligibility and withdrawal
-- RPCs aligned with the admin-managed settings. Existing settings win on re-run.
insert into public.countries(code,name,currency_code,is_enabled)
select c.country_code::char(2), c.country_name, c.default_currency_code::char(3), c.is_enabled
from public.country_settings c
on conflict(code) do update set
  name=excluded.name,
  currency_code=excluded.currency_code,
  is_enabled=excluded.is_enabled;

commit;
