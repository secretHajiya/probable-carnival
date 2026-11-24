-- Vyra Rewards Global — Step 16: in-app notifications and member support
begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) between 4 and 120),
  category text not null default 'general'
    check (category in ('general','account','wallet','withdrawal','rewards','technical')),
  status text not null default 'open'
    check (status in ('open','in_progress','waiting_member','resolved','closed')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high')),
  assigned_admin_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id),
  sender_role text not null check (sender_role in ('member','admin')),
  message text not null check (char_length(trim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  notification_type text not null default 'general'
    check (notification_type in ('general','wallet','withdrawal','reward','support','security')),
  action_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_user_recent_idx
  on public.support_tickets(user_id, created_at desc);
create index if not exists support_tickets_queue_idx
  on public.support_tickets(status, priority, updated_at desc);
create index if not exists support_messages_ticket_recent_idx
  on public.support_messages(ticket_id, created_at);
create index if not exists member_notifications_user_recent_idx
  on public.member_notifications(user_id, created_at desc);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.member_notifications enable row level security;

revoke all on public.support_tickets, public.support_messages, public.member_notifications
  from public, anon, authenticated;

grant select on public.support_tickets, public.support_messages, public.member_notifications
  to authenticated;

create policy "Members read own support tickets" on public.support_tickets
for select to authenticated using (user_id = auth.uid());

create policy "Members read messages on own tickets" on public.support_messages
for select to authenticated using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.user_id = auth.uid()
  )
);

create policy "Members read own notifications" on public.member_notifications
for select to authenticated using (user_id = auth.uid());

create or replace function public.create_support_ticket(
  p_subject text,
  p_category text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_ticket uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_subject,''))) not between 4 and 120 then
    raise exception 'invalid_subject';
  end if;
  if char_length(trim(coalesce(p_message,''))) not between 1 and 5000 then
    raise exception 'invalid_message';
  end if;
  if coalesce(p_category,'general') not in
    ('general','account','wallet','withdrawal','rewards','technical') then
    raise exception 'invalid_category';
  end if;

  insert into public.support_tickets(user_id,subject,category)
  values (v_user,trim(p_subject),coalesce(p_category,'general'))
  returning id into v_ticket;

  insert into public.support_messages(ticket_id,sender_user_id,sender_role,message)
  values (v_ticket,v_user,'member',trim(p_message));

  return v_ticket;
end;
$$;

create or replace function public.member_reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_message_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_message,''))) not between 1 and 5000 then
    raise exception 'invalid_message';
  end if;

  if not exists (
    select 1 from public.support_tickets
    where id = p_ticket_id and user_id = v_user
      and status in ('open','in_progress','waiting_member')
  ) then raise exception 'ticket_not_available'; end if;

  insert into public.support_messages(ticket_id,sender_user_id,sender_role,message)
  values (p_ticket_id,v_user,'member',trim(p_message))
  returning id into v_message_id;

  update public.support_tickets
  set status = 'open', updated_at = now()
  where id = p_ticket_id and user_id = v_user;

  return v_message_id;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  update public.member_notifications
  set read_at = coalesce(read_at,now())
  where id = p_notification_id and user_id = v_user;
  return found;
end;
$$;

create or replace function public.admin_list_support_tickets(
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  ticket_id uuid, user_id uuid, subject text, category text,
  status text, priority text, created_at timestamptz, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_active_admin() then
    raise exception 'admin_required';
  end if;
  if p_status is not null and p_status not in
    ('open','in_progress','waiting_member','resolved','closed') then
    raise exception 'invalid_status';
  end if;
  return query
    select t.id,t.user_id,t.subject,t.category,t.status,t.priority,t.created_at,t.updated_at
    from public.support_tickets t
    where p_status is null or t.status = p_status
    order by case t.priority when 'high' then 0 when 'normal' then 1 else 2 end,
             t.updated_at desc
    limit least(greatest(coalesce(p_limit,25),1),100)
    offset greatest(coalesce(p_offset,0),0);
end;
$$;

create or replace function public.admin_get_support_messages(p_ticket_id uuid)
returns table (
  message_id uuid, sender_user_id uuid, sender_role text, message text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_active_admin() then
    raise exception 'admin_required';
  end if;
  return query
    select m.id,m.sender_user_id,m.sender_role,m.message,m.created_at
    from public.support_messages m
    where m.ticket_id = p_ticket_id
    order by m.created_at asc;
end;
$$;

create or replace function public.admin_reply_support_ticket(
  p_ticket_id uuid,
  p_message text,
  p_status text default 'waiting_member'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_user uuid;
  v_message_id uuid;
begin
  if v_admin is null or not public.is_active_admin() then
    raise exception 'admin_required';
  end if;
  if char_length(trim(coalesce(p_message,''))) not between 1 and 5000 then
    raise exception 'invalid_message';
  end if;
  if p_status not in ('in_progress','waiting_member','resolved','closed') then
    raise exception 'invalid_status';
  end if;

  select user_id into v_user from public.support_tickets
  where id = p_ticket_id for update;
  if not found then raise exception 'ticket_not_found'; end if;

  insert into public.support_messages(ticket_id,sender_user_id,sender_role,message)
  values (p_ticket_id,v_admin,'admin',trim(p_message))
  returning id into v_message_id;

  update public.support_tickets
  set status = p_status, assigned_admin_id = v_admin, updated_at = now()
  where id = p_ticket_id;

  insert into public.member_notifications(user_id,title,body,notification_type,action_path)
  values (v_user,'Support replied','There is a new reply to your support ticket.','support',
          '/support/' || p_ticket_id::text);

  insert into public.admin_audit_logs(
    actor_user_id,action,target_type,target_id,before_data,after_data
  ) values (
    v_admin,'support.ticket.replied','support_ticket',p_ticket_id::text,
    null,jsonb_build_object('status',p_status,'message_id',v_message_id)
  );

  return v_message_id;
end;
$$;

revoke all on function public.create_support_ticket(text,text,text) from public, anon;
revoke all on function public.member_reply_support_ticket(uuid,text) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.admin_list_support_tickets(text,integer,integer) from public, anon;
revoke all on function public.admin_get_support_messages(uuid) from public, anon;
revoke all on function public.admin_reply_support_ticket(uuid,text,text) from public, anon;

grant execute on function public.create_support_ticket(text,text,text) to authenticated;
grant execute on function public.member_reply_support_ticket(uuid,text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.admin_list_support_tickets(text,integer,integer) to authenticated;
grant execute on function public.admin_get_support_messages(uuid) to authenticated;
grant execute on function public.admin_reply_support_ticket(uuid,text,text) to authenticated;

commit;
