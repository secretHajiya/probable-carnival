-- Migration 023: global NG/US member country onboarding.
-- This makes NG and US selectable in the member app; it does NOT enable withdrawals.
-- withdrawal_config.is_enabled remains false for both countries as separately configured.
begin;

-- Currency metadata required by the global dashboard.
insert into public.currency_settings(currency_code, currency_name, minor_units, is_enabled)
values
  ('NGN', 'Nigerian Naira', 2, true),
  ('USD', 'United States Dollar', 2, true)
on conflict (currency_code) do update set
  currency_name = excluded.currency_name,
  minor_units = excluded.minor_units,
  is_enabled = true,
  updated_at = now();

-- Country metadata required by the member country selector.
insert into public.country_settings(country_code, country_name, default_currency_code, timezone_name, is_enabled)
values
  ('NG', 'Nigeria', 'NGN', 'Africa/Lagos', true),
  ('US', 'United States', 'USD', 'America/New_York', true)
on conflict (country_code) do update set
  country_name = excluded.country_name,
  default_currency_code = excluded.default_currency_code,
  timezone_name = excluded.timezone_name,
  is_enabled = true,
  updated_at = now();

-- Keep the operational country reference table aligned for eligibility checks.
insert into public.countries(code, name, currency_code, is_enabled)
values
  ('NG', 'Nigeria', 'NGN', true),
  ('US', 'United States', 'USD', true)
on conflict (code) do update set
  name = excluded.name,
  currency_code = excluded.currency_code,
  is_enabled = true;

-- Members choose their country once. Subsequent changes require a controlled support/admin process.
create or replace function public.set_member_country(p_country_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_country text := upper(trim(coalesce(p_country_code, '')));
  v_current text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if v_country not in ('NG', 'US') then
    raise exception 'unsupported_country';
  end if;
  if not exists (
    select 1 from public.country_settings c
    join public.currency_settings x on x.currency_code = c.default_currency_code
    where c.country_code = v_country and c.is_enabled = true and x.is_enabled = true
  ) then
    raise exception 'country_not_available';
  end if;

  select p.country_code into v_current
  from public.profiles p
  where p.id = auth.uid()
  for update;
  if not found then
    raise exception 'profile_not_found';
  end if;
  if v_current is not null and upper(trim(v_current::text)) <> v_country then
    raise exception 'country_already_selected_contact_support';
  end if;

  update public.profiles
  set country_code = v_country::char(2), updated_at = now()
  where id = auth.uid() and country_code is null;
end;
$$;

revoke all on function public.set_member_country(text) from public, anon;
grant execute on function public.set_member_country(text) to authenticated;

commit;
