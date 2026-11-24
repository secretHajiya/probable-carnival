-- Migration 027: expose only non-secret LevelPlay runtime identifiers to signed-in members.
-- Adds the Rewarded Ad Unit ID required by the mobile SDK. Keeps rewards disabled by default.
begin;

alter table public.levelplay_reward_config
  add column if not exists ad_unit_id text;

alter table public.levelplay_reward_config
  drop constraint if exists levelplay_config_ad_unit_length;
alter table public.levelplay_reward_config
  add constraint levelplay_config_ad_unit_length
  check (ad_unit_id is null or length(ad_unit_id) between 1 and 160);

-- Admin read includes the ad unit identifier, but never any S2S private key.
create or replace function public.admin_get_levelplay_reward_config()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;
  select pg_catalog.jsonb_build_object(
    'is_enabled',c.is_enabled,'app_key',c.app_key,'ad_unit_id',c.ad_unit_id,
    'placement_name',c.placement_name,'expected_reward_amount',c.expected_reward_amount,
    'coins_per_reward',c.coins_per_reward,'updated_at',c.updated_at
  ) into v_result from public.levelplay_reward_config c where c.id=true;
  return coalesce(v_result,'{}'::jsonb);
end;
$$;

-- Replace the prior five-argument admin writer with a six-argument writer.
drop function if exists public.admin_update_levelplay_reward_config(boolean,text,text,integer,bigint);
create or replace function public.admin_update_levelplay_reward_config(
  p_is_enabled boolean,
  p_app_key text,
  p_ad_unit_id text,
  p_placement_name text,
  p_expected_reward_amount integer,
  p_coins_per_reward bigint
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_app_key text := nullif(pg_catalog.btrim(coalesce(p_app_key,'')), '');
  v_ad_unit text := nullif(pg_catalog.btrim(coalesce(p_ad_unit_id,'')), '');
  v_placement text := nullif(pg_catalog.btrim(coalesce(p_placement_name,'')), '');
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;
  if coalesce(p_is_enabled,false) and (v_app_key is null or v_ad_unit is null or v_placement is null
      or coalesce(p_expected_reward_amount,0)<=0 or coalesce(p_coins_per_reward,0)<=0) then
    raise exception 'configure App Key, Ad Unit ID, Placement, expected reward and Vyra coins before enabling';
  end if;
  if length(coalesce(v_app_key,''))>160 or length(coalesce(v_ad_unit,''))>160 or length(coalesce(v_placement,''))>160 then
    raise exception 'LevelPlay configuration value is too long';
  end if;
  if coalesce(p_expected_reward_amount,0)<0 or coalesce(p_coins_per_reward,0)<0 then
    raise exception 'reward values cannot be negative';
  end if;
  select pg_catalog.to_jsonb(c) into v_before from public.levelplay_reward_config c where c.id=true for update;
  insert into public.levelplay_reward_config(id,is_enabled,app_key,ad_unit_id,placement_name,expected_reward_amount,coins_per_reward,updated_at,updated_by)
  values(true,coalesce(p_is_enabled,false),v_app_key,v_ad_unit,v_placement,coalesce(p_expected_reward_amount,0),coalesce(p_coins_per_reward,0),pg_catalog.now(),auth.uid())
  on conflict(id) do update set is_enabled=excluded.is_enabled,app_key=excluded.app_key,ad_unit_id=excluded.ad_unit_id,
    placement_name=excluded.placement_name,expected_reward_amount=excluded.expected_reward_amount,
    coins_per_reward=excluded.coins_per_reward,updated_at=pg_catalog.now(),updated_by=auth.uid();
  select pg_catalog.to_jsonb(c) into v_after from public.levelplay_reward_config c where c.id=true;
  insert into public.admin_audit_logs(actor_user_id,action,target_type,target_id,before_data,after_data)
  values(auth.uid(),'levelplay_reward_config_update','levelplay_reward_config','singleton',v_before,v_after);
end;
$$;

-- Member-facing RPC returns only public SDK identifiers and enabled status.
-- It never returns reward conversion values, audit data, or S2S secrets.
create or replace function public.get_levelplay_mobile_config()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;
  select pg_catalog.jsonb_build_object(
    'is_enabled',c.is_enabled,
    'app_key',case when c.is_enabled then c.app_key else null end,
    'ad_unit_id',case when c.is_enabled then c.ad_unit_id else null end,
    'placement_name',case when c.is_enabled then c.placement_name else null end
  ) into v_result from public.levelplay_reward_config c where c.id=true;
  return coalesce(v_result,pg_catalog.jsonb_build_object('is_enabled',false,'app_key',null,'ad_unit_id',null,'placement_name',null));
end;
$$;

revoke all on function public.admin_get_levelplay_reward_config() from public,anon;
revoke all on function public.admin_update_levelplay_reward_config(boolean,text,text,text,integer,bigint) from public,anon;
revoke all on function public.get_levelplay_mobile_config() from public,anon;
grant execute on function public.admin_get_levelplay_reward_config() to authenticated;
grant execute on function public.admin_update_levelplay_reward_config(boolean,text,text,text,integer,bigint) to authenticated;
grant execute on function public.get_levelplay_mobile_config() to authenticated;

commit;
