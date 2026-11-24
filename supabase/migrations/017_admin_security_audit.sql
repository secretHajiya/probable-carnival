-- Vyra Rewards Global — Step 13: admin role inventory and audit log reader
-- Read-only security tooling. It deliberately does not grant/revoke roles.
begin;

create or replace function public.admin_list_role_assignments(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  role text,
  granted_by uuid,
  granted_at timestamptz,
  is_active boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_roles ar
    where ar.user_id = auth.uid()
      and ar.is_active = true
      and ar.role = 'super_admin'
  ) then
    raise exception 'super_admin_required';
  end if;

  return query
  select ar.user_id, ar.role, ar.granted_by, ar.granted_at, ar.is_active
  from public.admin_roles ar
  order by ar.granted_at desc, ar.user_id
  limit least(greatest(coalesce(p_limit,50),1),100)
  offset greatest(coalesce(p_offset,0),0);
end;
$$;

create or replace function public.admin_list_audit_logs(
  p_target_type text default null,
  p_action_prefix text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  actor_user_id uuid,
  action text,
  target_type text,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_active_admin() then
    raise exception 'active_admin_required';
  end if;

  return query
  select l.id, l.actor_user_id, l.action, l.target_type, l.target_id,
         l.before_data, l.after_data, l.created_at
  from public.admin_audit_logs l
  where (p_target_type is null or l.target_type = p_target_type)
    and (p_action_prefix is null or l.action like p_action_prefix || '%')
  order by l.created_at desc, l.id desc
  limit least(greatest(coalesce(p_limit,50),1),100)
  offset greatest(coalesce(p_offset,0),0);
end;
$$;

revoke all on function public.admin_list_role_assignments(integer,integer) from public, anon;
revoke all on function public.admin_list_audit_logs(text,text,integer,integer) from public, anon;
grant execute on function public.admin_list_role_assignments(integer,integer) to authenticated;
grant execute on function public.admin_list_audit_logs(text,text,integer,integer) to authenticated;

commit;
