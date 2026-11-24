-- Read-only verification for Migration 022. Run after applying it to STAGING.
select
  to_regprocedure('public.admin_reveal_payout_details_envelope(uuid)') is not null as rpc_exists,
  coalesce((select prosecdef from pg_proc where oid = to_regprocedure('public.admin_reveal_payout_details_envelope(uuid)')), false) as security_definer,
  coalesce((select proconfig @> array['search_path=""'] from pg_proc where oid = to_regprocedure('public.admin_reveal_payout_details_envelope(uuid)')), false) as empty_search_path,
  has_function_privilege('anon', 'public.admin_reveal_payout_details_envelope(uuid)', 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', 'public.admin_reveal_payout_details_envelope(uuid)', 'EXECUTE') as authenticated_can_execute;

-- Expected: rpc_exists=true, security_definer=true, empty_search_path=true,
-- anon_can_execute=false, authenticated_can_execute=true.
