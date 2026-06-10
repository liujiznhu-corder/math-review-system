create index if not exists mistakes_status_created_idx
on public.mistakes (classification_status, created_at desc);

create index if not exists problems_question_type_created_idx
on public.problems (question_type_id, created_at desc);

create index if not exists problems_created_idx
on public.problems (created_at desc);
