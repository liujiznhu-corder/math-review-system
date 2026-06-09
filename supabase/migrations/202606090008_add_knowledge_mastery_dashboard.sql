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

create index if not exists knowledge_mastery_user_idx
on public.knowledge_mastery (user_id);

create index if not exists knowledge_mastery_question_type_idx
on public.knowledge_mastery (question_type_id);

drop trigger if exists set_knowledge_mastery_updated_at on public.knowledge_mastery;
create trigger set_knowledge_mastery_updated_at
before update on public.knowledge_mastery
for each row execute function public.set_updated_at();

alter table public.knowledge_mastery enable row level security;

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
