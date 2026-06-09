create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'teacher', 'student'))
);

create table if not exists public.question_types (
  id uuid primary key default gen_random_uuid(),
  level1 text not null,
  level2 text not null,
  level3 text not null,
  keywords text[] not null default '{}',
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_types_unique_path unique (level1, level2, level3)
);

create table if not exists public.question_type_examples (
  id uuid primary key default gen_random_uuid(),
  question_type_id uuid not null references public.question_types(id) on delete cascade,
  example_text text not null,
  solution_hint text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  question_type_id uuid references public.question_types(id) on delete set null,
  problem_type text not null default 'calculation',
  raw_latex text not null,
  normalized_text text,
  options_json jsonb,
  answer text,
  analysis text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint problems_problem_type_check check (
    problem_type in ('single_choice', 'fill_blank', 'calculation')
  )
);

create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  question_type_id uuid references public.question_types(id) on delete set null,
  stem text not null,
  problem_type text not null default 'calculation',
  input_type text not null default 'plain_text',
  raw_text text not null,
  raw_latex text,
  normalized_text text,
  normalized_stem text,
  options_json jsonb,
  latex_content text,
  source text,
  note text,
  answer text,
  analysis text,
  classification_status text not null default 'pending',
  classified_by text,
  teacher_note text,
  status text not null default 'reviewing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mistakes_problem_type_check check (problem_type in ('single_choice', 'fill_blank', 'calculation')),
  constraint mistakes_input_type_check check (input_type in ('plain_text', 'latex')),
  constraint mistakes_classification_status_check check (classification_status in ('pending', 'student_selected', 'teacher_confirmed')),
  constraint mistakes_classified_by_check check (classified_by is null or classified_by in ('student', 'teacher', 'system')),
  constraint mistakes_status_check check (status in ('reviewing', 'mastered', 'archived'))
);

create table if not exists public.review_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  mistake_id uuid not null references public.mistakes(id) on delete cascade,
  question_type_id uuid references public.question_types(id) on delete set null,
  interval_days integer not null,
  due_date date not null,
  review_date date not null,
  review_round text not null,
  status text not null default 'pending',
  result text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_tasks_interval_check check (interval_days in (1, 3, 7, 14, 30)),
  constraint review_tasks_status_check check (status in ('pending', 'completed', 'skipped')),
  constraint review_tasks_result_check check (result is null or result in ('mastered', 'not_mastered')),
  constraint review_tasks_round_check check (review_round in ('day1', 'day3', 'day7', 'day14', 'day30', 'retry_day3', 'retry_day7'))
);

create table if not exists public.knowledge_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  question_type_id uuid not null references public.question_types(id) on delete cascade,
  mastered_count integer not null default 0,
  total_reviews integer not null default 0,
  mastery_percent numeric(5,2) not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_mastery_unique_user_type unique (user_id, question_type_id),
  constraint knowledge_mastery_counts_check check (
    mastered_count >= 0
    and total_reviews >= 0
    and mastered_count <= total_reviews
  ),
  constraint knowledge_mastery_percent_check check (
    mastery_percent >= 0
    and mastery_percent <= 100
  )
);

create table if not exists public.review_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  mistake_id uuid not null references public.mistakes(id) on delete cascade,
  review_task_id uuid references public.review_tasks(id) on delete set null,
  result text not null,
  note text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint review_records_result_check check (result in ('correct', 'wrong', 'again'))
);

create index if not exists question_types_path_idx on public.question_types (level1, level2, level3);
create index if not exists question_types_keywords_idx on public.question_types using gin (keywords);
create index if not exists question_type_examples_type_idx on public.question_type_examples (question_type_id);
create index if not exists problems_question_type_idx on public.problems (question_type_id);
create index if not exists problems_created_by_idx on public.problems (created_by, created_at desc);
create index if not exists mistakes_user_created_idx on public.mistakes (user_id, created_at desc);
create index if not exists mistakes_type_idx on public.mistakes (question_type_id);
create index if not exists mistakes_problem_type_idx on public.mistakes (problem_type);
create index if not exists review_tasks_user_due_idx on public.review_tasks (user_id, due_date, status);
create index if not exists review_tasks_user_review_idx on public.review_tasks (user_id, review_date, status);
create index if not exists review_tasks_mistake_idx on public.review_tasks (mistake_id);
create index if not exists knowledge_mastery_user_idx on public.knowledge_mastery (user_id);
create index if not exists knowledge_mastery_question_type_idx on public.knowledge_mastery (question_type_id);
create index if not exists review_records_user_reviewed_idx on public.review_records (user_id, reviewed_at desc);

create or replace function public.current_user_can_manage_question_types()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'teacher')
  );
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_question_types_updated_at on public.question_types;
create trigger set_question_types_updated_at
before update on public.question_types
for each row execute function public.set_updated_at();

drop trigger if exists set_question_type_examples_updated_at on public.question_type_examples;
create trigger set_question_type_examples_updated_at
before update on public.question_type_examples
for each row execute function public.set_updated_at();

drop trigger if exists set_problems_updated_at on public.problems;
create trigger set_problems_updated_at
before update on public.problems
for each row execute function public.set_updated_at();

drop trigger if exists set_mistakes_updated_at on public.mistakes;
create trigger set_mistakes_updated_at
before update on public.mistakes
for each row execute function public.set_updated_at();

drop trigger if exists set_review_tasks_updated_at on public.review_tasks;
create trigger set_review_tasks_updated_at
before update on public.review_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_knowledge_mastery_updated_at on public.knowledge_mastery;
create trigger set_knowledge_mastery_updated_at
before update on public.knowledge_mastery
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_review_tasks_for_mistake()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.question_type_id is null
    or new.classification_status not in ('student_selected', 'teacher_confirmed') then
    return new;
  end if;

  begin
    insert into public.review_tasks (
      user_id,
      mistake_id,
      question_type_id,
      interval_days,
      due_date,
      review_date,
      review_round,
      status
    )
    select
      new.user_id,
      new.id,
      new.question_type_id,
      interval_day,
      (new.created_at::date + interval_day),
      (new.created_at::date + interval_day),
      ('day' || interval_day),
      'pending'
    from unnest(array[1, 3, 7, 14, 30]) as interval_day
    where not exists (
      select 1
      from public.review_tasks
      where mistake_id = new.id
    );
  exception
    when others then
      raise warning 'create_review_tasks_for_mistake skipped for mistake %, reason: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_mistake_created_create_review_tasks on public.mistakes;
create trigger on_mistake_created_create_review_tasks
after insert on public.mistakes
for each row execute function public.create_review_tasks_for_mistake();

drop trigger if exists on_mistake_classified_create_review_tasks on public.mistakes;
create trigger on_mistake_classified_create_review_tasks
after update of question_type_id, classification_status on public.mistakes
for each row execute function public.create_review_tasks_for_mistake();

create or replace function public.complete_review_task_from_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.review_task_id is not null then
    update public.review_tasks
    set status = 'completed',
        completed_at = new.reviewed_at
    where id = new.review_task_id
      and user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_review_record_created_complete_task on public.review_records;
create trigger on_review_record_created_complete_task
after insert on public.review_records
for each row execute function public.complete_review_task_from_record();

alter table public.profiles enable row level security;
alter table public.question_types enable row level security;
alter table public.question_type_examples enable row level security;
alter table public.problems enable row level security;
alter table public.mistakes enable row level security;
alter table public.review_tasks enable row level security;
alter table public.knowledge_mastery enable row level security;
alter table public.review_records enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "question_types_select_authenticated" on public.question_types;
create policy "question_types_select_authenticated"
on public.question_types for select
to authenticated
using (true);

drop policy if exists "question_types_insert_authenticated" on public.question_types;
drop policy if exists "question_types_insert_admin_teacher" on public.question_types;
create policy "question_types_insert_admin_teacher"
on public.question_types for insert
to authenticated
with check (public.current_user_can_manage_question_types());

drop policy if exists "question_types_update_authenticated" on public.question_types;
drop policy if exists "question_types_update_admin_teacher" on public.question_types;
create policy "question_types_update_admin_teacher"
on public.question_types for update
to authenticated
using (public.current_user_can_manage_question_types())
with check (public.current_user_can_manage_question_types());

drop policy if exists "question_types_delete_authenticated" on public.question_types;
drop policy if exists "question_types_delete_admin_teacher" on public.question_types;
create policy "question_types_delete_admin_teacher"
on public.question_types for delete
to authenticated
using (public.current_user_can_manage_question_types());

drop policy if exists "question_type_examples_select_authenticated" on public.question_type_examples;
create policy "question_type_examples_select_authenticated"
on public.question_type_examples for select
to authenticated
using (true);

drop policy if exists "question_type_examples_insert_authenticated" on public.question_type_examples;
drop policy if exists "question_type_examples_insert_admin_teacher" on public.question_type_examples;
create policy "question_type_examples_insert_admin_teacher"
on public.question_type_examples for insert
to authenticated
with check (public.current_user_can_manage_question_types());

drop policy if exists "question_type_examples_update_authenticated" on public.question_type_examples;
drop policy if exists "question_type_examples_update_admin_teacher" on public.question_type_examples;
create policy "question_type_examples_update_admin_teacher"
on public.question_type_examples for update
to authenticated
using (public.current_user_can_manage_question_types())
with check (public.current_user_can_manage_question_types());

drop policy if exists "question_type_examples_delete_authenticated" on public.question_type_examples;
drop policy if exists "question_type_examples_delete_admin_teacher" on public.question_type_examples;
create policy "question_type_examples_delete_admin_teacher"
on public.question_type_examples for delete
to authenticated
using (public.current_user_can_manage_question_types());

drop policy if exists "problems_select_authenticated" on public.problems;
create policy "problems_select_authenticated"
on public.problems for select
to authenticated
using (true);

drop policy if exists "problems_insert_admin_teacher" on public.problems;
create policy "problems_insert_admin_teacher"
on public.problems for insert
to authenticated
with check (public.current_user_can_manage_question_types());

drop policy if exists "problems_update_admin_teacher" on public.problems;
create policy "problems_update_admin_teacher"
on public.problems for update
to authenticated
using (public.current_user_can_manage_question_types())
with check (public.current_user_can_manage_question_types());

drop policy if exists "problems_delete_admin_teacher" on public.problems;
create policy "problems_delete_admin_teacher"
on public.problems for delete
to authenticated
using (public.current_user_can_manage_question_types());

drop policy if exists "mistakes_select_own" on public.mistakes;
create policy "mistakes_select_own"
on public.mistakes for select
to authenticated
using (
  user_id = auth.uid()
  or (
    classification_status = 'pending'
    and public.current_user_can_manage_question_types()
  )
);

drop policy if exists "mistakes_insert_own" on public.mistakes;
create policy "mistakes_insert_own"
on public.mistakes for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "mistakes_update_own" on public.mistakes;
drop policy if exists "mistakes_update_student_own" on public.mistakes;
drop policy if exists "mistakes_update_pending_admin_teacher" on public.mistakes;
drop policy if exists "mistakes_update_student_or_teacher_review" on public.mistakes;
create policy "mistakes_update_student_or_teacher_review"
on public.mistakes for update
to authenticated
using (
  user_id = auth.uid()
  or (
    classification_status = 'pending'
    and public.current_user_can_manage_question_types()
  )
)
with check (
  user_id = auth.uid()
  or (
    public.current_user_can_manage_question_types()
    and question_type_id is not null
    and classification_status = 'teacher_confirmed'
    and classified_by = 'teacher'
  )
);

drop policy if exists "mistakes_delete_own" on public.mistakes;
create policy "mistakes_delete_own"
on public.mistakes for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "review_tasks_select_own" on public.review_tasks;
create policy "review_tasks_select_own"
on public.review_tasks for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "review_tasks_insert_own" on public.review_tasks;
drop policy if exists "review_tasks_insert_student_or_admin_teacher" on public.review_tasks;
create policy "review_tasks_insert_student_or_admin_teacher"
on public.review_tasks for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.current_user_can_manage_question_types()
);

drop policy if exists "review_tasks_update_own" on public.review_tasks;
create policy "review_tasks_update_own"
on public.review_tasks for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "review_tasks_delete_own" on public.review_tasks;
create policy "review_tasks_delete_own"
on public.review_tasks for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "knowledge_mastery_select_own_or_admin_teacher" on public.knowledge_mastery;
create policy "knowledge_mastery_select_own_or_admin_teacher"
on public.knowledge_mastery for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_can_manage_question_types()
);

drop policy if exists "knowledge_mastery_insert_own_or_admin_teacher" on public.knowledge_mastery;
create policy "knowledge_mastery_insert_own_or_admin_teacher"
on public.knowledge_mastery for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.current_user_can_manage_question_types()
);

drop policy if exists "knowledge_mastery_update_own_or_admin_teacher" on public.knowledge_mastery;
create policy "knowledge_mastery_update_own_or_admin_teacher"
on public.knowledge_mastery for update
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_can_manage_question_types()
)
with check (
  user_id = auth.uid()
  or public.current_user_can_manage_question_types()
);

drop policy if exists "knowledge_mastery_delete_own" on public.knowledge_mastery;
create policy "knowledge_mastery_delete_own"
on public.knowledge_mastery for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "review_records_select_own" on public.review_records;
create policy "review_records_select_own"
on public.review_records for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "review_records_insert_own" on public.review_records;
create policy "review_records_insert_own"
on public.review_records for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "review_records_update_own" on public.review_records;
create policy "review_records_update_own"
on public.review_records for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "review_records_delete_own" on public.review_records;
create policy "review_records_delete_own"
on public.review_records for delete
to authenticated
using (user_id = auth.uid());
