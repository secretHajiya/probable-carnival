-- Migration 030: single-Super-Admin exchange-rate approval and activation.
-- Intentionally NOT executed against Production by this build step.
-- A single active super_admin may approve+activate a pending proposal in one atomic transaction.
-- MFA step-up is mandatory (JWT aal2); support, finance_reviewer, and admin are denied.
begin;

-- Enforce one active Super Admin account globally. If duplicates already exist,
-- this index fails closed and must be reconciled manually before deployment.
create unique index if not exists admin_roles_single_active_super_admin_idx
  on public.admin_roles ((role))
  where role='super_admin' and is_active=true;

alter table public.exchange_rate_drafts
  drop constraint if exists exchange_rate_drafts_status_check;
alter table public.exchange_rate_drafts
  add constraint exchange_rate_drafts_status_check
  check (status in ('pending','activated'));

alter table public.exchange_rate_drafts
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists activated_by uuid references auth.users(id),
  add column if not exists activated_at timestamptz,
  add column if not exists live_exchange_rate_id uuid references public.exchange_rates(id);

create or replace function public.admin_activate_exchange_rate_draft(p_draft_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_aal text := coalesce(auth.jwt()->>'aal','');
  v_draft public.exchange_rate_drafts%rowtype;
  v_old jsonb;
  v_new public.exchange_rates%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode='42501';
  end if;
  if v_aal <> 'aal2' then
    raise exception 'MFA step-up required before exchange-rate activation' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.admin_roles ar
    where ar.user_id=v_actor and ar.is_active=true and ar.role='super_admin'
  ) then
    raise exception 'super admin permission required' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(74102, 30);
  select * into v_draft from public.exchange_rate_drafts
  where id=p_draft_id for update;
  if not found then raise exception 'exchange-rate proposal not found'; end if;
  if v_draft.status <> 'pending' then raise exception 'proposal is not pending'; end if;
  if not exists (
    select 1 from public.country_settings cs
    join public.currency_settings cu on cu.currency_code=cs.default_currency_code
    where cs.country_code=v_draft.country_code
      and cs.default_currency_code=v_draft.currency_code
      and cs.is_enabled=true and cu.is_enabled=true
  ) then
    raise exception 'country and default currency must remain enabled';
  end if;

  select coalesce(jsonb_agg(to_jsonb(er) order by er.effective_from desc),'[]'::jsonb)
    into v_old
  from public.exchange_rates er
  where er.country_code=v_draft.country_code
    and er.currency_code=v_draft.currency_code
    and er.effective_from <= v_now
    and (er.effective_to is null or er.effective_to > v_now);

  update public.exchange_rates
    set effective_to=v_now
  where country_code=v_draft.country_code
    and currency_code=v_draft.currency_code
    and effective_from <= v_now
    and (effective_to is null or effective_to > v_now);

  insert into public.exchange_rates(
    country_code,currency_code,coins_per_major_unit,effective_from,effective_to,source
  ) values (
    v_draft.country_code,v_draft.currency_code,v_draft.coins_per_major_unit,v_now,null,'admin_approved'
  ) returning * into v_new;

  update public.exchange_rate_drafts set
    status='activated', approved_by=v_actor, approved_at=v_now,
    activated_by=v_actor, activated_at=v_now,
    live_exchange_rate_id=v_new.id, updated_by=v_actor, updated_at=v_now
  where id=v_draft.id;

  insert into public.admin_audit_logs(actor_user_id,action,target_type,target_id,before_data,after_data)
  values(
    v_actor,'exchange_rate_approved_and_activated','exchange_rate_draft',v_draft.id::text,
    jsonb_build_object('draft',to_jsonb(v_draft),'previous_live_rates',v_old),
    jsonb_build_object('draft_id',v_draft.id,'country_code',v_new.country_code,
      'currency_code',v_new.currency_code,'coins_per_major_unit',v_new.coins_per_major_unit,
      'effective_from',v_new.effective_from,'live_exchange_rate_id',v_new.id,
      'approved_by',v_actor,'activated_by',v_actor,'activated_at',v_now)
  );

  return jsonb_build_object('status','activated','draft_id',v_draft.id,
    'live_exchange_rate_id',v_new.id,'country_code',v_new.country_code,
    'currency_code',v_new.currency_code,'coins_per_major_unit',v_new.coins_per_major_unit,
    'effective_from',v_new.effective_from);
end;
$$;

revoke all on function public.admin_activate_exchange_rate_draft(uuid) from public,anon;
grant execute on function public.admin_activate_exchange_rate_draft(uuid) to authenticated;
commit;
