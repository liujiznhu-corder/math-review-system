alter table public.mistakes
add column if not exists classification_status text not null default 'pending',
add column if not exists classified_by text,
add column if not exists teacher_note text;

update public.mistakes
set classification_status = 'student_selected',
    classified_by = coalesce(classified_by, 'student')
where question_type_id is not null
  and classification_status = 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mistakes_classification_status_check'
      and conrelid = 'public.mistakes'::regclass
  ) then
    alter table public.mistakes
    add constraint mistakes_classification_status_check
    check (classification_status in ('pending', 'student_selected', 'teacher_confirmed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'mistakes_classified_by_check'
      and conrelid = 'public.mistakes'::regclass
  ) then
    alter table public.mistakes
    add constraint mistakes_classified_by_check
    check (classified_by is null or classified_by in ('student', 'teacher', 'system'));
  end if;
end;
$$;

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

drop trigger if exists on_mistake_created_create_review_tasks on public.mistakes;
create trigger on_mistake_created_create_review_tasks
after insert on public.mistakes
for each row execute function public.create_review_tasks_for_mistake();

drop trigger if exists on_mistake_classified_create_review_tasks on public.mistakes;
create trigger on_mistake_classified_create_review_tasks
after update of question_type_id, classification_status on public.mistakes
for each row execute function public.create_review_tasks_for_mistake();

drop policy if exists "mistakes_select_own" on public.mistakes;
create policy "mistakes_select_own"
on public.mistakes for select
to authenticated
using (
  user_id = auth.uid()
  or (
    classification_status = 'pending'
    and public.current_user_can_manage_question_types()
  )
);

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
