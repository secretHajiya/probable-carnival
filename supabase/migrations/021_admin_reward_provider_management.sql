-- Migration 021: audited admin controls over the existing reward provider tables.
-- Reuses reward_providers and provider_apps from 001_initial_schema; no shadow catalogue.
-- Secret values remain in Worker secret storage. Only a reference identifier is stored.
begin;

alter table public.reward_providers
  add column if not exists integration_type text not null default 'offerwall',
  add column if not exists secret_reference text,
  add column if not exists notes text not null default '',
  add column if not exists updated_at timestamptz not null default now();

alter table public.reward_providers
  drop constraint if exists reward_providers_integration_type_check;
alter table public.reward_providers
  add constraint reward_providers_integration_type_check
  check (integration_type in ('offerwall','survey','task','other'));
alter table public.reward_providers
  drop constraint if exists reward_providers_secret_reference_check;
alter table public.reward_providers
  add constraint reward_providers_secret_reference_check
  check (secret_reference is null or secret_reference ~ '^[A-Za-z][A-Za-z0-9_.:/-]{1,159}$');
alter table public.reward_providers
  drop constraint if exists reward_providers_notes_check;
alter table public.reward_providers
  add constraint reward_providers_notes_check check (length(notes) <= 1000);

alter table public.provider_apps
  add column if not exists updated_at timestamptz not null default now();

alter table public.reward_providers enable row level security;
alter table public.provider_apps enable row level security;
revoke all on public.reward_providers, public.provider_apps from anon, authenticated;

create or replace function public.admin_list_reward_providers()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;
  select jsonb_build_object(
    'providers',coalesce((select jsonb_agg(jsonb_build_object(
      'provider_code',p.code,'display_name',p.display_name,'integration_type',p.integration_type,
      'is_enabled',p.is_enabled,'secret_configured',(p.secret_reference is not null),
      'notes',p.notes,'updated_at',p.updated_at) order by p.code) from public.reward_providers p),'[]'::jsonb),
    'apps',coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'provider_code',p.code,'platform',a.platform,'external_app_id',a.external_app_id,
      'country_code',a.country_code,'is_enabled',a.is_enabled)
      order by p.code,a.platform,a.country_code)
      from public.provider_apps a join public.reward_providers p on p.id=a.provider_id),'[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;

create or replace function public.admin_upsert_reward_provider(
  p_provider_code text,p_display_name text,p_integration_type text default 'offerwall',
  p_is_enabled boolean default false,p_secret_reference text default null,p_notes text default ''
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_code text:=lower(trim(coalesce(p_provider_code,'')));
  v_before jsonb;
  v_after jsonb;
  v_existing_secret text;
  v_effective_secret text;
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;
  if v_code !~ '^[a-z][a-z0-9_-]{1,39}$' then raise exception 'invalid provider code'; end if;
  if length(trim(coalesce(p_display_name,''))) not between 2 and 100 then raise exception 'invalid provider display name'; end if;
  if p_integration_type not in ('offerwall','survey','task','other') then raise exception 'invalid integration type'; end if;
  if length(coalesce(p_notes,'')) > 1000 then raise exception 'provider notes are too long'; end if;
  if p_secret_reference is not null and trim(p_secret_reference) !~ '^[A-Za-z][A-Za-z0-9_.:/-]{1,159}$' then
    raise exception 'enter a server-side secret reference identifier only, never a secret value';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(74103,1);
  select p.secret_reference,pg_catalog.to_jsonb(p) into v_existing_secret,v_before
  from public.reward_providers p where p.code=v_code for update;
  v_effective_secret:=coalesce(nullif(trim(p_secret_reference),''),v_existing_secret);
  if coalesce(p_is_enabled,false) and v_effective_secret is null then
    raise exception 'configure a server-side secret reference before enabling provider';
  end if;
  insert into public.reward_providers(code,display_name,integration_type,is_enabled,secret_reference,notes,updated_at)
  values(v_code,trim(p_display_name),p_integration_type,coalesce(p_is_enabled,false),v_effective_secret,coalesce(p_notes,''),pg_catalog.now())
  on conflict(code) do update set display_name=excluded.display_name,integration_type=excluded.integration_type,
    is_enabled=excluded.is_enabled,secret_reference=excluded.secret_reference,notes=excluded.notes,updated_at=pg_catalog.now();
  if not coalesce(p_is_enabled,false) then
    update public.provider_apps a set is_enabled=false,updated_at=pg_catalog.now()
    where a.provider_id=(select p.id from public.reward_providers p where p.code=v_code);
  end if;
  select pg_catalog.jsonb_build_object('provider_code',p.code,'display_name',p.display_name,
    'integration_type',p.integration_type,'is_enabled',p.is_enabled,
    'secret_reference_configured',(p.secret_reference is not null),'notes',p.notes)
    into v_after from public.reward_providers p where p.code=v_code;
  insert into public.admin_audit_logs(actor_user_id,action,target_type,target_id,before_data,after_data)
  values(auth.uid(),'reward_provider_upsert','reward_provider',v_code,v_before,v_after);
end; $$;

create or replace function public.admin_upsert_reward_provider_app(
  p_provider_code text,p_platform text,p_external_app_id text,p_country_code text,p_is_enabled boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_code text:=lower(trim(coalesce(p_provider_code,'')));
  v_country text:=upper(trim(coalesce(p_country_code,'')));
  v_provider_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;
  if v_code !~ '^[a-z][a-z0-9_-]{1,39}$' or p_platform not in ('web','android','ios') or v_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid provider, platform or country';
  end if;
  if length(trim(coalesce(p_external_app_id,''))) not between 1 and 120 then raise exception 'invalid external app ID'; end if;
  select p.id into v_provider_id from public.reward_providers p where p.code=v_code;
  if v_provider_id is null then raise exception 'provider_not_found'; end if;
  if coalesce(p_is_enabled,false) and not exists(
    select 1 from public.reward_providers p where p.id=v_provider_id and p.is_enabled
  ) then raise exception 'provider must be enabled first'; end if;
  if coalesce(p_is_enabled,false) and not exists(
    select 1 from public.country_settings c join public.countries x on x.code=c.country_code
    join public.currency_settings m on m.currency_code=c.default_currency_code
    where c.country_code=v_country and c.is_enabled and x.is_enabled and m.is_enabled
  ) then raise exception 'country and its default currency must be enabled first'; end if;
  perform pg_catalog.pg_advisory_xact_lock(74103,1);
  select pg_catalog.to_jsonb(a),a.id into v_before,v_id from public.provider_apps a
    where a.provider_id=v_provider_id and a.platform=p_platform and a.country_code=v_country for update;
  insert into public.provider_apps(provider_id,platform,external_app_id,country_code,is_enabled,updated_at)
  values(v_provider_id,p_platform,trim(p_external_app_id),v_country,coalesce(p_is_enabled,false),pg_catalog.now())
  on conflict(provider_id,platform,country_code) do update set external_app_id=excluded.external_app_id,
    is_enabled=excluded.is_enabled,updated_at=pg_catalog.now() returning id into v_id;
  select pg_catalog.to_jsonb(a) into v_after from public.provider_apps a where a.id=v_id;
  insert into public.admin_audit_logs(actor_user_id,action,target_type,target_id,before_data,after_data)
  values(auth.uid(),'reward_provider_app_upsert','provider_app',v_code||':'||p_platform||':'||v_country,v_before,v_after);
end; $$;

revoke all on function public.admin_list_reward_providers() from public,anon;
revoke all on function public.admin_upsert_reward_provider(text,text,text,boolean,text,text) from public,anon;
revoke all on function public.admin_upsert_reward_provider_app(text,text,text,text,boolean) from public,anon;
grant execute on function public.admin_list_reward_providers() to authenticated;
grant execute on function public.admin_upsert_reward_provider(text,text,text,boolean,text,text) to authenticated;
grant execute on function public.admin_upsert_reward_provider_app(text,text,text,text,boolean) to authenticated;

insert into public.reward_providers(code,display_name,is_enabled,integration_type,notes)
values('cpx','CPX Research',false,'offerwall','Disabled until callback signature, IP policy, app ID, country eligibility, duplicate credit and reversal tests are verified.')
on conflict(code) do nothing;
commit;
