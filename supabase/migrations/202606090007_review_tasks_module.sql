alter table public.review_tasks
add column if not exists question_type_id uuid references public.question_types(id) on delete set null,
add column if not exists review_date date,
add column if not exists review_round text,
add column if not exists result text;

alter table public.review_tasks
drop constraint if exists review_tasks_status_check,
drop constraint if exists review_tasks_result_check,
drop constraint if exists review_tasks_round_check,
drop constraint if exists review_tasks_unique_interval;

update public.review_tasks rt
set question_type_id = m.question_type_id
from public.mistakes m
where rt.mistake_id = m.id
  and rt.question_type_id is null;

update public.review_tasks
set review_date = coalesce(review_date, due_date),
    review_round = coalesce(review_round, 'day' || interval_days),
    status = case when status = 'due' then 'pending' else status end;

alter table public.review_tasks
alter column review_date set not null,
alter column review_round set not null,
alter column status set default 'pending';

alter table public.review_tasks
add constraint review_tasks_status_check
check (status in ('pending', 'completed', 'skipped'));

alter table public.review_tasks
add constraint review_tasks_result_check
check (result is null or result in ('mastered', 'not_mastered'));

alter table public.review_tasks
add constraint review_tasks_round_check
check (review_round in ('day1', 'day3', 'day7', 'day14', 'day30', 'retry_day3', 'retry_day7'));

create index if not exists review_tasks_user_review_idx
on public.review_tasks (user_id, review_date, status);

create index if not exists review_tasks_mistake_idx
on public.review_tasks (mistake_id);

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
    insert into public.review_tasks (
      user_id,
      mistake_id,
      question_type_id,
      interval_days,
      due_date,
      review_date,
      review_round,
      status
    )
    select
      new.user_id,
      new.id,
      new.question_type_id,
      interval_day,
      (new.created_at::date + interval_day),
      (new.created_at::date + interval_day),
      ('day' || interval_day),
      'pending'
    from unnest(array[1, 3, 7, 14, 30]) as interval_day
    where not exists (
      select 1
      from public.review_tasks
      where mistake_id = new.id
    );
  exception
    when others then
      raise warning 'create_review_tasks_for_mistake skipped for mistake %, reason: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop policy if exists "review_tasks_select_own" on public.review_tasks;
create policy "review_tasks_select_own"
on public.review_tasks for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "review_tasks_update_own" on public.review_tasks;
create policy "review_tasks_update_own"
on public.review_tasks for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "review_tasks_insert_own" on public.review_tasks;
drop policy if exists "review_tasks_insert_student_or_admin_teacher" on public.review_tasks;
create policy "review_tasks_insert_student_or_admin_teacher"
on public.review_tasks for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.current_user_can_manage_question_types()
);
