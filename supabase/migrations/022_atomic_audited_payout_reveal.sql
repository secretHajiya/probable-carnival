-- Vyra Rewards Global — atomic, audited payout-details reveal.
-- Apply only after 013 is installed and verified in staging.
begin;

create or replace function public.admin_reveal_payout_details_envelope(p_withdrawal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_withdrawal public.withdrawal_requests%rowtype;
  v_vault public.payout_details_vault%rowtype;
begin
  if v_actor is null or not public.is_finance_admin() then
    raise exception 'finance_admin_required' using errcode = '42501';
  end if;

  -- Serialize reveal against status transitions that also lock this request.
  select * into v_withdrawal
  from public.withdrawal_requests
  where id = p_withdrawal_id
  for update;
  if not found then raise exception 'withdrawal_not_found' using errcode = 'P0002'; end if;
  if v_withdrawal.status not in ('requested','under_review','approved','processing') then
    raise exception 'payout_details_not_available_for_this_status' using errcode = 'P0001';
  end if;

  select * into v_vault
  from public.payout_details_vault
  where withdrawal_id = p_withdrawal_id
  for update;
  if not found then raise exception 'payout_details_unavailable' using errcode = 'P0002'; end if;

  -- Audit must commit in the same transaction before the Worker can decrypt/respond.
  insert into public.admin_audit_logs(
    actor_user_id, action, target_type, target_id, after_data
  ) values (
    v_actor, 'payout_details_viewed', 'withdrawal', p_withdrawal_id::text,
    jsonb_build_object('payout_method', v_vault.payout_method, 'country_code', v_vault.country_code)
  );

  -- Only the authenticated finance-admin RPC caller receives ciphertext, never plaintext.
  return jsonb_build_object(
    'country_code', v_vault.country_code,
    'payout_method', v_vault.payout_method,
    'encrypted_payload', v_vault.encrypted_payload,
    'nonce', v_vault.nonce,
    'key_version', v_vault.key_version
  );
end;
$$;

revoke all on function public.admin_reveal_payout_details_envelope(uuid) from public, anon;
grant execute on function public.admin_reveal_payout_details_envelope(uuid) to authenticated;
commit;
