-- Vyra Rewards Global — standalone migration 016: read-only admin member directory
-- Depends on profiles, account_status and is_active_admin() from 001_initial_schema.sql.
begin;

create or replace function public.admin_list_members(
  p_search text default null,
  p_status text default null,
  p_country_code text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  member_id uuid,
  display_name text,
  country_code char(2),
  account_status text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_country text := nullif(upper(btrim(p_country_code)), '');
begin
  if auth.uid() is null or not public.is_active_admin() then
    raise exception 'active_admin_required' using errcode = '42501';
  end if;

  -- Keep this list synchronized with public.account_status enum in migration 001.
  if p_status is not null and p_status not in ('active','suspended','closed') then
    raise exception 'invalid_account_status_filter' using errcode = '22023';
  end if;
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid_country_code' using errcode = '22023';
  end if;

  return query
  select p.id, p.display_name, p.country_code, p.status::text, p.created_at
  from public.profiles p
  where
    (v_search is null or
      p.display_name ilike ('%' || replace(replace(replace(v_search, chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_') || '%' ) escape chr(92) or
      p.id::text = v_search)
    and (p_status is null or p.status::text = p_status)
    and (v_country is null or p.country_code = v_country)
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limit,25),1),100)
  offset greatest(coalesce(p_offset,0),0);
end;
$$;

revoke all on function public.admin_list_members(text,text,text,integer,integer) from public, anon;
grant execute on function public.admin_list_members(text,text,text,integer,integer) to authenticated;

commit;
