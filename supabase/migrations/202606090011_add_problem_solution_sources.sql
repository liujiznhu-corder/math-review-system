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

insert into public.problems (
  created_by,
  question_type_id,
  problem_type,
  raw_latex,
  normalized_text,
  options_json,
  answer,
  analysis,
  source,
  source_type,
  source_mistake_id,
  created_at,
  updated_at
)
select
  m.user_id,
  m.question_type_id,
  m.problem_type,
  coalesce(nullif(m.raw_latex, ''), nullif(m.latex_content, ''), m.stem),
  coalesce(m.normalized_stem, m.stem),
  m.options_json,
  m.answer,
  m.analysis,
  m.source,
  'student_submitted',
  m.id,
  m.created_at,
  m.updated_at
from public.mistakes m
where m.question_type_id is not null
  and m.classification_status in ('student_selected', 'teacher_confirmed')
  and not exists (
    select 1
    from public.problems p
    where p.source_mistake_id = m.id
  );
