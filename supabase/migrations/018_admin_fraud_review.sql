-- Vyra Rewards Global — Fraud review queue. No automatic scoring or account/wallet action.
begin;

create table if not exists public.fraud_reviews (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 reason_code text not null check (length(btrim(reason_code)) between 2 and 80),
 risk_score integer not null check (risk_score between 0 and 100),
 status text not null default 'pending' check (status in ('pending','reviewing','cleared','restricted')),
 reviewer_id uuid references auth.users(id) on delete set null,
 reviewer_note text check (reviewer_note is null or length(reviewer_note)<=2000),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 signal_data jsonb not null default '{}'::jsonb check (jsonb_typeof(signal_data)='object')
);
create index if not exists fraud_reviews_status_created_idx on public.fraud_reviews(status,created_at desc);
create index if not exists fraud_reviews_user_created_idx on public.fraud_reviews(user_id,created_at desc);
alter table public.fraud_reviews enable row level security;
revoke all on public.fraud_reviews from public,anon,authenticated;
grant select,insert,update,delete on public.fraud_reviews to service_role;

create or replace function public.admin_list_fraud_reviews(p_status text default 'pending',p_limit integer default 25,p_offset integer default 0)
returns table(id uuid,user_id uuid,display_name text,country_code char(2),reason_code text,risk_score integer,status text,reviewer_id uuid,reviewer_note text,created_at timestamptz,reviewed_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_active_admin() then raise exception 'active_admin_required'; end if;
 if p_status is not null and p_status not in ('pending','reviewing','cleared','restricted') then raise exception 'invalid_fraud_status_filter'; end if;
 return query select f.id,f.user_id,p.display_name,p.country_code,f.reason_code,f.risk_score,f.status,f.reviewer_id,f.reviewer_note,f.created_at,f.reviewed_at from public.fraud_reviews f left join public.profiles p on p.id=f.user_id where p_status is null or f.status=p_status order by f.created_at desc,f.id desc limit least(greatest(coalesce(p_limit,25),1),100) offset greatest(coalesce(p_offset,0),0);
end; $$;

create or replace function public.admin_review_fraud_case(p_review_id uuid,p_decision text,p_note text) returns text
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_before jsonb; v_after jsonb;
begin
 if v_actor is null or not public.is_active_admin() then raise exception 'active_admin_required'; end if;
 if p_decision not in ('reviewing','cleared','restricted') then raise exception 'invalid_fraud_decision'; end if;
 if p_note is null or length(btrim(p_note))<5 or length(p_note)>2000 then raise exception 'review_note_required'; end if;
 select jsonb_build_object('id',id,'user_id',user_id,'reason_code',reason_code,'risk_score',risk_score,'status',status) into v_before from public.fraud_reviews where id=p_review_id for update;
 if v_before is null then raise exception 'fraud_case_not_found'; end if;
 update public.fraud_reviews set status=p_decision,reviewer_id=v_actor,reviewer_note=btrim(p_note),reviewed_at=case when p_decision in ('cleared','restricted') then now() else null end where id=p_review_id;
 select jsonb_build_object('id',id,'user_id',user_id,'reason_code',reason_code,'risk_score',risk_score,'status',status,'reviewer_id',reviewer_id,'reviewer_note',reviewer_note,'reviewed_at',reviewed_at) into v_after from public.fraud_reviews where id=p_review_id;
 insert into public.admin_audit_logs(actor_user_id,action,target_type,target_id,before_data,after_data) values(v_actor,'fraud_case_'||p_decision,'fraud_review',p_review_id::text,v_before,v_after);
 return p_decision;
end; $$;
revoke all on function public.admin_list_fraud_reviews(text,integer,integer) from public,anon;
revoke all on function public.admin_review_fraud_case(uuid,text,text) from public,anon;
grant execute on function public.admin_list_fraud_reviews(text,integer,integer) to authenticated;
grant execute on function public.admin_review_fraud_case(uuid,text,text) to authenticated;
commit;
