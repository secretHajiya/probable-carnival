-- Migration 028: extend the existing LevelPlay runtime configuration to all ad formats.
-- Requires migrations 026 and 027. All ad formats remain disabled by default.
begin;

alter table public.levelplay_reward_config
  add column if not exists interstitial_enabled boolean not null default false,
  add column if not exists interstitial_ad_unit_id text,
  add column if not exists interstitial_placement_name text,
  add column if not exists banner_enabled boolean not null default false,
  add column if not exists banner_ad_unit_id text,
  add column if not exists banner_placement_name text;

-- Pre-fill the ad-unit identifiers and placement names supplied by the project owner.
-- Formats remain disabled until the exact App Key is entered and an administrator enables them.
update public.levelplay_reward_config set
  ad_unit_id=coalesce(ad_unit_id,'q18qwpr5ofs8gi84'),
  placement_name=coalesce(placement_name,'BP_Rewarded_Android'),
  interstitial_ad_unit_id=coalesce(interstitial_ad_unit_id,'t59334kmc1nzmzuv'),
  interstitial_placement_name=coalesce(interstitial_placement_name,'BP_Interstitial_Android'),
  banner_ad_unit_id=coalesce(banner_ad_unit_id,'q7hv6pyis1rd4v9x'),
  banner_placement_name=coalesce(banner_placement_name,'BP_Banner_Android')
where id=true;

alter table public.levelplay_reward_config
  drop constraint if exists levelplay_interstitial_values,
  drop constraint if exists levelplay_banner_values;
alter table public.levelplay_reward_config
  add constraint levelplay_interstitial_values check (
    not interstitial_enabled or (app_key is not null and interstitial_ad_unit_id is not null
      and length(btrim(interstitial_ad_unit_id)) between 1 and 160
      and interstitial_placement_name is not null
      and length(btrim(interstitial_placement_name)) between 1 and 160)
  ),
  add constraint levelplay_banner_values check (
    not banner_enabled or (app_key is not null and banner_ad_unit_id is not null
      and length(btrim(banner_ad_unit_id)) between 1 and 160
      and banner_placement_name is not null
      and length(btrim(banner_placement_name)) between 1 and 160)
  );

create or replace function public.admin_get_levelplay_reward_config()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;
  select pg_catalog.jsonb_build_object(
    'is_enabled',c.is_enabled,'app_key',c.app_key,'ad_unit_id',c.ad_unit_id,
    'placement_name',c.placement_name,'expected_reward_amount',c.expected_reward_amount,
    'coins_per_reward',c.coins_per_reward,'interstitial_enabled',c.interstitial_enabled,
    'interstitial_ad_unit_id',c.interstitial_ad_unit_id,
    'interstitial_placement_name',c.interstitial_placement_name,
    'banner_enabled',c.banner_enabled,'banner_ad_unit_id',c.banner_ad_unit_id,
    'banner_placement_name',c.banner_placement_name,'updated_at',c.updated_at
  ) into v_result from public.levelplay_reward_config c where c.id=true;
  return coalesce(v_result,'{}'::jsonb);
end;
$$;

-- Replace the 027 writer with an additive writer covering all three formats.
drop function if exists public.admin_update_levelplay_reward_config(boolean,text,text,text,integer,bigint);
create function public.admin_update_levelplay_reward_config(
  p_is_enabled boolean,
  p_app_key text,
  p_ad_unit_id text,
  p_placement_name text,
  p_expected_reward_amount integer,
  p_coins_per_reward bigint,
  p_interstitial_enabled boolean,
  p_interstitial_ad_unit_id text,
  p_interstitial_placement_name text,
  p_banner_enabled boolean,
  p_banner_ad_unit_id text,
  p_banner_placement_name text
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_app_key text := nullif(pg_catalog.btrim(coalesce(p_app_key,'')), '');
  v_rewarded_unit text := nullif(pg_catalog.btrim(coalesce(p_ad_unit_id,'')), '');
  v_rewarded_place text := nullif(pg_catalog.btrim(coalesce(p_placement_name,'')), '');
  v_interstitial_unit text := nullif(pg_catalog.btrim(coalesce(p_interstitial_ad_unit_id,'')), '');
  v_interstitial_place text := nullif(pg_catalog.btrim(coalesce(p_interstitial_placement_name,'')), '');
  v_banner_unit text := nullif(pg_catalog.btrim(coalesce(p_banner_ad_unit_id,'')), '');
  v_banner_place text := nullif(pg_catalog.btrim(coalesce(p_banner_placement_name,'')), '');
begin
  if auth.uid() is null or not public.is_configuration_admin() then
    raise exception 'admin access required' using errcode='42501';
  end if;
  if coalesce(p_is_enabled,false) and (v_app_key is null or v_rewarded_unit is null or v_rewarded_place is null
      or coalesce(p_expected_reward_amount,0)<=0 or coalesce(p_coins_per_reward,0)<=0) then
    raise exception 'configure App Key, Rewarded Ad Unit ID, Placement, expected reward and Vyra coins before enabling Rewarded';
  end if;
  if coalesce(p_interstitial_enabled,false) and (v_app_key is null or v_interstitial_unit is null or v_interstitial_place is null) then
    raise exception 'configure App Key, Interstitial Ad Unit ID and Placement before enabling Interstitial';
  end if;
  if coalesce(p_banner_enabled,false) and (v_app_key is null or v_banner_unit is null or v_banner_place is null) then
    raise exception 'configure App Key, Banner Ad Unit ID and Placement before enabling Banner';
  end if;
  if greatest(length(coalesce(v_app_key,'')),length(coalesce(v_rewarded_unit,'')),length(coalesce(v_rewarded_place,'')),
      length(coalesce(v_interstitial_unit,'')),length(coalesce(v_interstitial_place,'')),
      length(coalesce(v_banner_unit,'')),length(coalesce(v_banner_place,''))) > 160 then
    raise exception 'LevelPlay configuration value is too long';
  end if;
  if coalesce(p_expected_reward_amount,0)<0 or coalesce(p_coins_per_reward,0)<0 then
    raise exception 'reward values cannot be negative';
  end if;
  select pg_catalog.to_jsonb(c) into v_before from public.levelplay_reward_config c where c.id=true for update;
  insert into public.levelplay_reward_config(
    id,is_enabled,app_key,ad_unit_id,placement_name,expected_reward_amount,coins_per_reward,
    interstitial_enabled,interstitial_ad_unit_id,interstitial_placement_name,
    banner_enabled,banner_ad_unit_id,banner_placement_name,updated_at,updated_by
  ) values (
    true,coalesce(p_is_enabled,false),v_app_key,v_rewarded_unit,v_rewarded_place,
    coalesce(p_expected_reward_amount,0),coalesce(p_coins_per_reward,0),
    coalesce(p_interstitial_enabled,false),v_interstitial_unit,v_interstitial_place,
    coalesce(p_banner_enabled,false),v_banner_unit,v_banner_place,pg_catalog.now(),auth.uid()
  ) on conflict(id) do update set
    is_enabled=excluded.is_enabled,app_key=excluded.app_key,ad_unit_id=excluded.ad_unit_id,
    placement_name=excluded.placement_name,expected_reward_amount=excluded.expected_reward_amount,
    coins_per_reward=excluded.coins_per_reward,interstitial_enabled=excluded.interstitial_enabled,
    interstitial_ad_unit_id=excluded.interstitial_ad_unit_id,
    interstitial_placement_name=excluded.interstitial_placement_name,
    banner_enabled=excluded.banner_enabled,banner_ad_unit_id=excluded.banner_ad_unit_id,
    banner_placement_name=excluded.banner_placement_name,updated_at=pg_catalog.now(),updated_by=auth.uid();
  select pg_catalog.to_jsonb(c) into v_after from public.levelplay_reward_config c where c.id=true;
  insert into public.admin_audit_logs(actor_user_id,action,target_type,target_id,before_data,after_data)
  values(auth.uid(),'levelplay_reward_config_update','levelplay_reward_config','singleton',v_before,v_after);
end;
$$;

create or replace function public.get_levelplay_mobile_config()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;
  select pg_catalog.jsonb_build_object(
    'app_key',case when (c.is_enabled or c.interstitial_enabled or c.banner_enabled) then c.app_key else null end,
    'rewarded_enabled',c.is_enabled,
    'rewarded_ad_unit_id',case when c.is_enabled then c.ad_unit_id else null end,
    'rewarded_placement_name',case when c.is_enabled then c.placement_name else null end,
    'interstitial_enabled',c.interstitial_enabled,
    'interstitial_ad_unit_id',case when c.interstitial_enabled then c.interstitial_ad_unit_id else null end,
    'interstitial_placement_name',case when c.interstitial_enabled then c.interstitial_placement_name else null end,
    'banner_enabled',c.banner_enabled,
    'banner_ad_unit_id',case when c.banner_enabled then c.banner_ad_unit_id else null end,
    'banner_placement_name',case when c.banner_enabled then c.banner_placement_name else null end
  ) into v_result from public.levelplay_reward_config c where c.id=true;
  return coalesce(v_result,pg_catalog.jsonb_build_object(
    'app_key',null,'rewarded_enabled',false,'rewarded_ad_unit_id',null,'rewarded_placement_name',null,
    'interstitial_enabled',false,'interstitial_ad_unit_id',null,'interstitial_placement_name',null,
    'banner_enabled',false,'banner_ad_unit_id',null,'banner_placement_name',null));
end;
$$;

revoke all on function public.admin_get_levelplay_reward_config() from public,anon;
revoke all on function public.admin_update_levelplay_reward_config(boolean,text,text,text,integer,bigint,boolean,text,text,boolean,text,text) from public,anon;
revoke all on function public.get_levelplay_mobile_config() from public,anon;
grant execute on function public.admin_get_levelplay_reward_config() to authenticated;
grant execute on function public.admin_update_levelplay_reward_config(boolean,text,text,text,integer,bigint,boolean,text,text,boolean,text,text) to authenticated;
grant execute on function public.get_levelplay_mobile_config() to authenticated;

commit;
