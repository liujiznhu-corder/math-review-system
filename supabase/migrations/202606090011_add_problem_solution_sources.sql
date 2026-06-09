alter table public.problems
add column if not exists source_type text not null default 'teacher_created',
add column if not exists source_mistake_id uuid references public.mistakes(id) on delete set null;

alter table public.problems
drop constraint if exists problems_source_type_check;

alter table public.problems
add constraint problems_source_type_check
check (source_type in ('teacher_created', 'student_submitted'));

create index if not exists problems_source_type_idx
on public.problems (source_type, updated_at desc);

create unique index if not exists problems_source_mistake_unique_idx
on public.problems (source_mistake_id)
where source_mistake_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'problems_source_mistake_unique'
  ) then
    alter table public.problems
    add constraint problems_source_mistake_unique unique (source_mistake_id);
  end if;
end $$;

-- Do not backfill student mistakes into public.problems here.
-- Student-submitted mistakes are shown in the solution center directly.
-- Teachers add selected mistakes to the problem library manually from /teacher/solutions.
