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
    insert into public.review_tasks (user_id, mistake_id, interval_days, due_date)
    select new.user_id, new.id, interval_day, (new.created_at::date + interval_day)
    from unnest(array[1, 3, 7, 14, 30]) as interval_day
    on conflict (mistake_id, interval_days) do nothing;
  exception
    when others then
      raise warning 'create_review_tasks_for_mistake skipped for mistake %, reason: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;
