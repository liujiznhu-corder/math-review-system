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

drop policy if exists "review_tasks_insert_own" on public.review_tasks;
drop policy if exists "review_tasks_insert_student_or_admin_teacher" on public.review_tasks;

create policy "review_tasks_insert_student_or_admin_teacher"
on public.review_tasks for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.current_user_can_manage_question_types()
);
