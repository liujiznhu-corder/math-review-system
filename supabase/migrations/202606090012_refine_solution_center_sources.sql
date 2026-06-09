alter table public.problems
add column if not exists answer text,
add column if not exists analysis text,
add column if not exists source_type text not null default 'teacher_created',
add column if not exists source_mistake_id uuid references public.mistakes(id) on delete set null,
add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.mistakes
add column if not exists answer text,
add column if not exists analysis text;

alter table public.problems
drop constraint if exists problems_source_type_check;

alter table public.problems
add constraint problems_source_type_check
check (source_type in ('teacher_created', 'student_submitted'));

create index if not exists problems_source_type_idx
on public.problems (source_type, updated_at desc);

create index if not exists problems_created_by_idx
on public.problems (created_by);

create unique index if not exists problems_source_mistake_unique_idx
on public.problems (source_mistake_id)
where source_mistake_id is not null;
