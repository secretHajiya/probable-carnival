-- Forward-only extension for the standalone authentication implementation.
-- Apply after 001_initial_schema.sql. Does not create or grant admin privileges.
begin;

alter table public.profiles
  drop constraint if exists profiles_language_check;
alter table public.profiles
  add constraint profiles_language_check
  check (preferred_language in ('en','ar','fr','es','pt','de','tr','hi','zh','ha'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_language text;
begin
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  v_language := lower(split_part(coalesce(new.raw_user_meta_data->>'preferred_language','en'),'-',1));
  if v_language not in ('en','ar','fr','es','pt','de','tr','hi','zh','ha') then
    v_language := 'en';
  end if;

  insert into public.profiles(id,display_name,referral_code,preferred_language,email_verified_at)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'display_name',''),100),
    v_code,
    v_language,
    case when new.email_confirmed_at is not null then new.email_confirmed_at else null end
  )
  on conflict (id) do update set
    display_name = coalesce(nullif(public.profiles.display_name,''), excluded.display_name),
    preferred_language = excluded.preferred_language,
    email_verified_at = coalesce(public.profiles.email_verified_at, excluded.email_verified_at);

  insert into public.wallet_accounts(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Keep profile edits restricted to the two explicitly granted columns in migration 001.
revoke update on public.profiles from authenticated;
grant update(display_name, preferred_language) on public.profiles to authenticated;

commit;
