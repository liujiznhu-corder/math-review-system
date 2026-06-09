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

alter table public.problems
add column if not exists problem_type text not null default 'calculation',
add column if not exists raw_latex text,
add column if not exists normalized_text text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'problems'
      and column_name = 'normalized_stem'
  ) then
    execute 'update public.problems set normalized_text = normalized_stem where normalized_text is null';
  end if;
end $$;

alter table public.problems
add column if not exists options_json jsonb,
add column if not exists answer text,
add column if not exists analysis text,
add column if not exists source text,
add column if not exists question_type_id uuid references public.question_types(id) on delete set null,
add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid(),
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

alter table public.problems
drop constraint if exists problems_problem_type_check;

update public.problems
set raw_latex = ''
where raw_latex is null;

alter table public.problems
add constraint problems_problem_type_check
check (problem_type in ('single_choice', 'fill_blank', 'calculation'));

alter table public.problems
alter column raw_latex set not null;

create index if not exists problems_question_type_idx
on public.problems (question_type_id);

create index if not exists problems_created_by_idx
on public.problems (created_by, created_at desc);

drop trigger if exists set_problems_updated_at on public.problems;
create trigger set_problems_updated_at
before update on public.problems
for each row execute function public.set_updated_at();

alter table public.problems enable row level security;

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
