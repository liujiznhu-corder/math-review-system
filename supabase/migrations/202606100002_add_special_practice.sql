create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  question_type_id uuid not null references public.question_types(id) on delete cascade,
  question_count integer not null default 5,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_sessions_question_count_check check (question_count > 0),
  constraint practice_sessions_status_check check (status in ('active', 'completed', 'abandoned'))
);

create table if not exists public.practice_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  question_type_id uuid references public.question_types(id) on delete set null,
  position integer not null,
  status text not null default 'pending',
  result text,
  answered_at timestamptz,
  added_to_mistakes_at timestamptz,
  created_mistake_id uuid references public.mistakes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_records_position_check check (position > 0),
  constraint practice_records_status_check check (status in ('pending', 'completed')),
  constraint practice_records_result_check check (result is null or result in ('mastered', 'not_mastered')),
  constraint practice_records_unique_session_position unique (session_id, position),
  constraint practice_records_unique_session_problem unique (session_id, problem_id)
);

create index if not exists practice_sessions_user_created_idx
on public.practice_sessions (user_id, created_at desc);

create index if not exists practice_sessions_question_type_idx
on public.practice_sessions (question_type_id);

create index if not exists practice_records_session_position_idx
on public.practice_records (session_id, position);

create index if not exists practice_records_user_status_idx
on public.practice_records (user_id, status);

create index if not exists practice_records_problem_idx
on public.practice_records (problem_id);

drop trigger if exists set_practice_sessions_updated_at on public.practice_sessions;
create trigger set_practice_sessions_updated_at
before update on public.practice_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_practice_records_updated_at on public.practice_records;
create trigger set_practice_records_updated_at
before update on public.practice_records
for each row execute function public.set_updated_at();

alter table public.practice_sessions enable row level security;
alter table public.practice_records enable row level security;

drop policy if exists "practice_sessions_select_own" on public.practice_sessions;
create policy "practice_sessions_select_own"
on public.practice_sessions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "practice_sessions_insert_own" on public.practice_sessions;
create policy "practice_sessions_insert_own"
on public.practice_sessions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "practice_sessions_update_own" on public.practice_sessions;
create policy "practice_sessions_update_own"
on public.practice_sessions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "practice_records_select_own" on public.practice_records;
create policy "practice_records_select_own"
on public.practice_records for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "practice_records_insert_own" on public.practice_records;
create policy "practice_records_insert_own"
on public.practice_records for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "practice_records_update_own" on public.practice_records;
create policy "practice_records_update_own"
on public.practice_records for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
