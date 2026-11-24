-- Vyra Rewards Global — standalone migration 006: finance dashboard RPCs
-- Uses existing admin_roles/is_finance_admin helpers. No role is granted here.
begin;

create or replace function public.admin_get_finance_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_finance_admin() then
    raise exception 'finance_admin_required';
  end if;

  select jsonb_build_object(
    'pending_withdrawals', (
      select count(*) from public.withdrawal_requests
      where status in ('requested','under_review')
    ),
    'approved_unpaid_withdrawals', (
      select count(*) from public.withdrawal_requests
      where status in ('approved','processing')
    ),
    'paid_withdrawals', (
      select count(*) from public.withdrawal_requests
      where status = 'paid'
    ),
    'rejected_withdrawals', (
      select count(*) from public.withdrawal_requests
      where status = 'rejected'
    ),
    'active_members', (
      select count(*) from public.profiles where status = 'active'
    ),
    'suspended_members', (
      select count(*) from public.profiles where status = 'suspended'
    ),
    'available_coins_total', (
      select coalesce(sum(available_coins),0) from public.wallet_accounts
    ),
    'pending_coins_total', (
      select coalesce(sum(pending_coins),0) from public.wallet_accounts
    ),
    'lifetime_coins_total', (
      select coalesce(sum(lifetime_earned_coins),0) from public.wallet_accounts
    ),
    'generated_at', now()
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_list_withdrawals(
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  country_code char(2),
  payout_method text,
  amount_coins bigint,
  amount_minor bigint,
  currency_code char(3),
  fee_minor bigint,
  status public.withdrawal_status,
  requested_at timestamptz,
  reviewed_at timestamptz,
  rejection_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_finance_admin() then
    raise exception 'finance_admin_required';
  end if;
  if p_status is not null and p_status not in
    ('requested','under_review','approved','processing','paid','rejected','cancelled','failed') then
    raise exception 'invalid_withdrawal_status_filter';
  end if;

  return query
  select wr.id, wr.user_id, p.display_name, wr.country_code,
         wr.payout_method, wr.amount_coins, wr.amount_minor, wr.currency_code,
         wr.fee_minor, wr.status, wr.requested_at, wr.reviewed_at, wr.rejection_reason
  from public.withdrawal_requests wr
  left join public.profiles p on p.id = wr.user_id
  where p_status is null or wr.status::text = p_status
  order by wr.requested_at desc, wr.id desc
  limit least(greatest(coalesce(p_limit,25),1),100)
  offset greatest(coalesce(p_offset,0),0);
end;
$$;

create or replace function public.admin_review_withdrawal_audited(
  p_withdrawal_id uuid,
  p_decision text,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_result text;
begin
  if v_actor is null or not public.is_finance_admin() then
    raise exception 'finance_admin_required';
  end if;

  select jsonb_build_object(
    'id',id,'user_id',user_id,'status',status,'amount_coins',amount_coins,
    'amount_minor',amount_minor,'currency_code',currency_code
  ) into v_before
  from public.withdrawal_requests where id = p_withdrawal_id for update;

  if v_before is null then raise exception 'withdrawal_not_found'; end if;

  v_result := public.review_withdrawal_request(p_withdrawal_id,p_decision,p_note);

  select jsonb_build_object(
    'id',id,'user_id',user_id,'status',status,'amount_coins',amount_coins,
    'amount_minor',amount_minor,'currency_code',currency_code
  ) into v_after
  from public.withdrawal_requests where id = p_withdrawal_id;

  insert into public.admin_audit_logs(
    actor_user_id, action, target_type, target_id, before_data, after_data
  ) values (
    v_actor, 'withdrawal_' || v_result, 'withdrawal', p_withdrawal_id::text,
    v_before, v_after
  );

  return v_result;
end;
$$;

revoke all on function public.admin_get_finance_overview() from public, anon, authenticated;
revoke all on function public.admin_list_withdrawals(text,integer,integer) from public, anon, authenticated;
revoke all on function public.admin_review_withdrawal_audited(uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_get_finance_overview() to authenticated;
grant execute on function public.admin_list_withdrawals(text,integer,integer) to authenticated;
grant execute on function public.admin_review_withdrawal_audited(uuid,text,text) to authenticated;

commit;
