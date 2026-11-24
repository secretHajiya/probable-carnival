-- Vyra Rewards Global — Step 43: PayPal submission state/reference hardening
-- Review and test in a non-production database before any production application.
-- This migration does not enable withdrawals and does not contact PayPal.
begin;

create or replace function public.paypal_record_submission(
  p_withdrawal_id uuid,
  p_provider_batch_id text,
  p_provider_item_id text,
  p_ambiguous boolean default false,
  p_rejected boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a public.paypal_payout_attempts%rowtype;
  v_rows integer;
begin
  if p_withdrawal_id is null then
    raise exception 'withdrawal_id_required';
  end if;
  if coalesce(p_ambiguous,false) and coalesce(p_rejected,false) then
    raise exception 'invalid_submission_outcome';
  end if;
  if (p_provider_batch_id is null) <> (p_provider_item_id is null) then
    raise exception 'provider_reference_pair_required';
  end if;
  if p_provider_batch_id is not null and
     (length(p_provider_batch_id) not between 1 and 128 or
      length(p_provider_item_id) not between 1 and 128) then
    raise exception 'invalid_provider_reference';
  end if;
  if not coalesce(p_ambiguous,false) and not coalesce(p_rejected,false)
     and p_provider_batch_id is null then
    raise exception 'provider_reference_required_for_submission';
  end if;
  if (coalesce(p_ambiguous,false) or coalesce(p_rejected,false))
     and p_provider_batch_id is not null then
    raise exception 'uncertain_or_rejected_submission_must_not_claim_provider_reference';
  end if;

  select * into v_a
    from public.paypal_payout_attempts
   where withdrawal_id = p_withdrawal_id
   for update;
  if not found then raise exception 'payout_attempt_not_claimed'; end if;

  if v_a.status in ('succeeded','failed','quarantined') then
    raise exception 'payout_attempt_terminal';
  end if;

  -- Once PayPal has acknowledged a batch, a later response must never replace
  -- its provider identifiers or downgrade the attempt to reconciling/quarantined.
  if v_a.provider_batch_id is not null or v_a.provider_item_id is not null then
    if p_provider_batch_id is distinct from v_a.provider_batch_id or
       p_provider_item_id is distinct from v_a.provider_item_id then
      raise exception 'paypal_provider_reference_conflict';
    end if;
    if v_a.status = 'submitted' and not coalesce(p_ambiguous,false)
       and not coalesce(p_rejected,false) then
      return;
    end if;
    raise exception 'paypal_submission_state_regression';
  end if;

  if v_a.status not in ('claimed','reconciling') then
    raise exception 'payout_attempt_state_not_submittable';
  end if;

  update public.paypal_payout_attempts
     set provider_batch_id = p_provider_batch_id,
         provider_item_id = p_provider_item_id,
         status = case when coalesce(p_rejected,false) then 'quarantined'
                       when coalesce(p_ambiguous,false) then 'reconciling'
                       else 'submitted' end,
         updated_at = now()
   where id = v_a.id;

  -- Keep payout_records.provider_reference as the stable sender batch ID; the
  -- actual PayPal provider batch ID is stored separately on paypal_payout_attempts.
  update public.payout_records
     set updated_at = now()
   where withdrawal_id = p_withdrawal_id
     and provider_name = 'paypal';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'paypal_payout_record_missing';
  end if;
end;
$$;

revoke all on function public.paypal_record_submission(uuid,text,text,boolean,boolean)
  from public, anon, authenticated;
grant execute on function public.paypal_record_submission(uuid,text,text,boolean,boolean)
  to service_role;

commit;
