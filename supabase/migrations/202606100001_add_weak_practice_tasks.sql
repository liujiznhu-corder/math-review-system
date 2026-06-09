create table if not exists public.weak_practice_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  question_type_id uuid not null references public.question_types(id) on delete cascade,
  practice_date date not null,
  source_type text not null,
  status text not null default 'pending',
  result text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weak_practice_tasks_source_type_check check (
    source_type in ('weak', 'secondary', 'random')
  ),
  constraint weak_practice_tasks_status_check check (
    status in ('pending', 'completed')
  ),
  constraint weak_practice_tasks_result_check check (
    result is null or result in ('mastered', 'not_mastered')
  ),
  constraint weak_practice_tasks_unique_daily_problem unique (
    user_id,
    practice_date,
    problem_id
  )
);

create index if not exists weak_practice_tasks_user_date_idx
on public.weak_practice_tasks (user_id, practice_date, status);

create index if not exists weak_practice_tasks_problem_idx
on public.weak_practice_tasks (problem_id);

create index if not exists weak_practice_tasks_question_type_idx
on public.weak_practice_tasks (question_type_id);

drop trigger if exists set_weak_practice_tasks_updated_at on public.weak_practice_tasks;
create trigger set_weak_practice_tasks_updated_at
before update on public.weak_practice_tasks
for each row execute function public.set_updated_at();

alter table public.weak_practice_tasks enable row level security;

drop policy if exists "weak_practice_tasks_select_own" on public.weak_practice_tasks;
create policy "weak_practice_tasks_select_own"
on public.weak_practice_tasks for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "weak_practice_tasks_insert_own" on public.weak_practice_tasks;
create policy "weak_practice_tasks_insert_own"
on public.weak_practice_tasks for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "weak_practice_tasks_update_own" on public.weak_practice_tasks;
create policy "weak_practice_tasks_update_own"
on public.weak_practice_tasks for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
