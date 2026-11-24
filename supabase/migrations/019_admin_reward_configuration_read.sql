-- Migration 019: admin-only read API for reward configuration.
-- Deliberately does not expose writes or enable rewards.
begin;
create or replace function public.admin_get_reward_configuration()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_rules jsonb; v_checkin jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',rr.id,'country_code',rr.country_code,'provider_id',rr.provider_id,
    'rule_name',rr.rule_name,'coins_per_revenue_major_unit',rr.coins_per_revenue_major_unit,
    'is_active',rr.is_active,'effective_from',rr.effective_from,'effective_to',rr.effective_to
  ) order by rr.country_code nulls last,rr.rule_name),'[]'::jsonb)
  into v_rules from public.reward_rules rr;
  select case when cfg.id is null then
    jsonb_build_object('configured',false,'is_enabled',false,'reward_coins',0,'timezone_name',null)
  else jsonb_build_object('configured',true,'is_enabled',cfg.is_enabled,
    'reward_coins',cfg.reward_coins,'timezone_name',cfg.timezone_name,
    'updated_at',cfg.updated_at,'updated_by',cfg.updated_by) end
  into v_checkin from (select true as singleton) seed
  left join public.daily_checkin_config cfg on cfg.id=true;
  return jsonb_build_object('reward_rules',v_rules,'daily_checkin',v_checkin);
end; $$;
revoke all on function public.admin_get_reward_configuration() from public,anon;
grant execute on function public.admin_get_reward_configuration() to authenticated;
commit;
