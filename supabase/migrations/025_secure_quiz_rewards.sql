-- Vyra Rewards Global
-- Migration 025: Secure Quiz Rewards
-- Default disabled. Does not change withdrawal settings.

begin;

create table if not exists public.quiz_config (
  id boolean primary key default true check (id = true),
  is_enabled boolean not null default false,
  daily_attempt_limit integer not null default 5
    check (daily_attempt_limit between 1 and 20),
  reward_coins bigint not null default 10
    check (reward_coins between 0 and 1000000),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.quiz_config(id, is_enabled, daily_attempt_limit, reward_coins)
values (true, false, 5, 10)
on conflict (id) do nothing;

create table if not exists public.quiz_questions (
  question_key text primary key,
  question_text text not null,
  options jsonb not null,
  correct_option text not null,
  explanation text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_options_array check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 6
  )
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null references public.quiz_questions(question_key),
  quiz_date date not null,
  selected_option text,
  is_correct boolean,
  reward_coins bigint not null default 0 check (reward_coins >= 0),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index if not exists quiz_attempts_user_date_idx
  on public.quiz_attempts(user_id, quiz_date, created_at desc);

alter table public.quiz_config enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

revoke all on public.quiz_config from anon, authenticated;
revoke all on public.quiz_questions from anon, authenticated;
revoke all on public.quiz_attempts from anon, authenticated;

grant select on public.quiz_attempts to authenticated;

drop policy if exists "Quiz config admin access" on public.quiz_config;
create policy "Quiz config admin access"
on public.quiz_config
for select to authenticated
using (public.is_active_admin());

drop policy if exists "Quiz questions admin access" on public.quiz_questions;
create policy "Quiz questions admin access"
on public.quiz_questions
for select to authenticated
using (public.is_active_admin());

drop policy if exists "Members read own quiz attempts" on public.quiz_attempts;
create policy "Members read own quiz attempts"
on public.quiz_attempts
for select to authenticated
using (user_id = (select auth.uid()) or public.is_active_admin());

-- Member requests a question. Correct answers are never returned.
create or replace function public.get_quiz_question()
returns table (
  attempt_id uuid,
  question_key text,
  question_text text,
  options jsonb,
  attempts_remaining integer,
  reward_per_correct bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_config public.quiz_config%rowtype;
  v_timezone text;
  v_today date;
  v_used integer;
  v_question public.quiz_questions%rowtype;
  v_attempt uuid;
begin
  if v_user is null then
    raise exception 'authentication_required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user;

  if not found or v_profile.status is distinct from 'active'::public.account_status then
    raise exception 'active_account_required';
  end if;

  select * into v_config
  from public.quiz_config
  where id = true;

  if not found or not v_config.is_enabled then
    raise exception 'quiz_disabled';
  end if;

  v_timezone := case upper(coalesce(v_profile.country_code::text, 'NG'))
    when 'NG' then 'Africa/Lagos'
    when 'US' then 'America/New_York'
    else 'UTC'
  end;

  v_today := (now() at time zone v_timezone)::date;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user::text || ':quiz:' || v_today::text, 0)
  );

  select count(*)::integer into v_used
  from public.quiz_attempts
  where user_id = v_user and quiz_date = v_today;

  if v_used >= v_config.daily_attempt_limit then
    raise exception 'daily_quiz_limit_reached';
  end if;

  select q.* into v_question
  from public.quiz_questions q
  where q.is_active = true
    and not exists (
      select 1
      from public.quiz_attempts a
      where a.user_id = v_user
        and a.quiz_date = v_today
        and a.question_key = q.question_key
    )
  order by random()
  limit 1;

  if not found then
    raise exception 'no_new_quiz_questions_available';
  end if;

  insert into public.quiz_attempts(user_id, question_key, quiz_date)
  values (v_user, v_question.question_key, v_today)
  returning id into v_attempt;

  return query
  select
    v_attempt,
    v_question.question_key,
    v_question.question_text,
    v_question.options,
    greatest(v_config.daily_attempt_limit - v_used - 1, 0),
    v_config.reward_coins;
end;
$$;

-- Server checks the answer and credits the wallet once only.
create or replace function public.submit_quiz_answer(
  p_attempt_id uuid,
  p_selected_option text
)
returns table (
  is_correct boolean,
  reward_coins bigint,
  explanation text,
  attempts_remaining integer,
  available_coins bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_config public.quiz_config%rowtype;
  v_attempt public.quiz_attempts%rowtype;
  v_question public.quiz_questions%rowtype;
  v_timezone text;
  v_today date;
  v_correct boolean;
  v_reward bigint := 0;
  v_remaining integer;
  v_balance bigint;
begin
  if v_user is null then
    raise exception 'authentication_required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user;

  if not found or v_profile.status is distinct from 'active'::public.account_status then
    raise exception 'active_account_required';
  end if;

  select * into v_config
  from public.quiz_config
  where id = true;

  if not found or not v_config.is_enabled then
    raise exception 'quiz_disabled';
  end if;

  v_timezone := case upper(coalesce(v_profile.country_code::text, 'NG'))
    when 'NG' then 'Africa/Lagos'
    when 'US' then 'America/New_York'
    else 'UTC'
  end;

  v_today := (now() at time zone v_timezone)::date;

  select * into v_attempt
  from public.quiz_attempts
  where id = p_attempt_id
    and user_id = v_user
  for update;

  if not found then
    raise exception 'quiz_attempt_not_found';
  end if;

  if v_attempt.answered_at is not null then
    raise exception 'quiz_attempt_already_submitted';
  end if;

  if v_attempt.quiz_date <> v_today then
    raise exception 'quiz_attempt_expired';
  end if;

  if nullif(trim(p_selected_option), '') is null then
    raise exception 'answer_required';
  end if;

  select * into v_question
  from public.quiz_questions
  where question_key = v_attempt.question_key;

  if not found then
    raise exception 'quiz_question_unavailable';
  end if;

  v_correct := lower(trim(p_selected_option)) =
               lower(trim(v_question.correct_option));

  if v_correct then
    v_reward := v_config.reward_coins;
  end if;

  update public.quiz_attempts
  set selected_option = trim(p_selected_option),
      is_correct = v_correct,
      reward_coins = v_reward,
      answered_at = now()
  where id = v_attempt.id;

  if v_reward > 0 then
    insert into public.wallet_ledger(
      user_id, entry_type, amount_coins, balance_bucket,
      reference_type, reference_id, idempotency_key,
      description, created_by
    ) values (
      v_user, 'bonus', v_reward, 'available',
      'quiz_reward', v_attempt.id::text,
      'quiz-reward:' || v_attempt.id::text,
      'Quiz correct answer reward', v_user
    );

    update public.wallet_accounts
    set available_coins = available_coins + v_reward,
        lifetime_earned_coins = lifetime_earned_coins + v_reward,
        updated_at = now()
    where user_id = v_user
    returning available_coins into v_balance;

    if not found then
      raise exception 'wallet_account_missing';
    end if;
  else
    select available_coins into v_balance
    from public.wallet_accounts
    where user_id = v_user;

    if not found then
      raise exception 'wallet_account_missing';
    end if;
  end if;

  select greatest(v_config.daily_attempt_limit - count(*)::integer, 0)
  into v_remaining
  from public.quiz_attempts
  where user_id = v_user and quiz_date = v_today;

  return query
  select v_correct, v_reward, v_question.explanation,
         v_remaining, v_balance;
end;
$$;

-- Admin updates quiz settings and question bank.
create or replace function public.admin_update_quiz_config(
  p_is_enabled boolean,
  p_daily_attempt_limit integer,
  p_reward_coins bigint,
  p_questions jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_key text;
  v_question text;
  v_options jsonb;
  v_correct text;
  v_count integer := 0;
begin
  if not public.is_active_admin() then
    raise exception 'admin_access_required';
  end if;

  if p_daily_attempt_limit is null
     or p_daily_attempt_limit < 1
     or p_daily_attempt_limit > 20 then
    raise exception 'daily_attempt_limit_out_of_range';
  end if;

  if p_reward_coins is null
     or p_reward_coins < 0
     or p_reward_coins > 1000000 then
    raise exception 'quiz_reward_out_of_range';
  end if;

  if jsonb_typeof(p_questions) <> 'array'
     or jsonb_array_length(p_questions) > 500 then
    raise exception 'quiz_questions_invalid';
  end if;

  update public.quiz_questions
  set is_active = false, updated_at = now();

  for v_item in select value from jsonb_array_elements(p_questions)
  loop
    v_count := v_count + 1;
    v_key := nullif(trim(v_item->>'question_key'), '');
    v_question := nullif(trim(v_item->>'question_text'), '');
    v_options := v_item->'options';
    v_correct := nullif(trim(v_item->>'correct_option'), '');

    if v_key is null or length(v_key) > 80
       or v_question is null or length(v_question) > 1000
       or jsonb_typeof(v_options) <> 'array'
       or jsonb_array_length(v_options) < 2
       or jsonb_array_length(v_options) > 6
       or v_correct is null
       or not (v_options ? v_correct) then
      raise exception 'quiz_question_invalid';
    end if;

    insert into public.quiz_questions(
      question_key, question_text, options, correct_option,
      explanation, is_active, updated_at
    ) values (
      v_key, v_question, v_options, v_correct,
      nullif(trim(v_item->>'explanation'), ''),
      coalesce((v_item->>'is_active')::boolean, true),
      now()
    )
    on conflict (question_key) do update set
      question_text = excluded.question_text,
      options = excluded.options,
      correct_option = excluded.correct_option,
      explanation = excluded.explanation,
      is_active = excluded.is_active,
      updated_at = now();
  end loop;

  update public.quiz_config
  set is_enabled = p_is_enabled,
      daily_attempt_limit = p_daily_attempt_limit,
      reward_coins = p_reward_coins,
      updated_by = auth.uid(),
      updated_at = now()
  where id = true;
end;
$$;

revoke all on function public.get_quiz_question() from public, anon;
grant execute on function public.get_quiz_question() to authenticated;

revoke all on function public.submit_quiz_answer(uuid, text) from public, anon;
grant execute on function public.submit_quiz_answer(uuid, text) to authenticated;

revoke all on function public.admin_update_quiz_config(boolean, integer, bigint, jsonb) from public, anon;
grant execute on function public.admin_update_quiz_config(boolean, integer, bigint, jsonb) to authenticated;

commit;
