-- Read-only post-deployment verification for Migration 024.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('spin_wheel_config', 'spin_wheel_spins')
order by tablename;

select p.proname as function_name,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('spin_wheel', 'admin_update_spin_wheel_config')
order by p.proname;

select is_enabled, daily_free_spins, jsonb_array_length(segments) as segment_count
from public.spin_wheel_config
where id = true;
