alter table public.profiles
add column if not exists role text not null default 'student';

drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_role_check
    check (role in ('admin', 'teacher', 'student'));
  end if;
end;
$$;

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

drop policy if exists "question_types_insert_authenticated" on public.question_types;
drop policy if exists "question_types_update_authenticated" on public.question_types;
drop policy if exists "question_types_delete_authenticated" on public.question_types;
drop policy if exists "question_types_insert_admin_teacher" on public.question_types;
drop policy if exists "question_types_update_admin_teacher" on public.question_types;
drop policy if exists "question_types_delete_admin_teacher" on public.question_types;

create policy "question_types_insert_admin_teacher"
on public.question_types for insert
to authenticated
with check (public.current_user_can_manage_question_types());

create policy "question_types_update_admin_teacher"
on public.question_types for update
to authenticated
using (public.current_user_can_manage_question_types())
with check (public.current_user_can_manage_question_types());

create policy "question_types_delete_admin_teacher"
on public.question_types for delete
to authenticated
using (public.current_user_can_manage_question_types());

drop policy if exists "question_type_examples_insert_authenticated" on public.question_type_examples;
drop policy if exists "question_type_examples_update_authenticated" on public.question_type_examples;
drop policy if exists "question_type_examples_delete_authenticated" on public.question_type_examples;
drop policy if exists "question_type_examples_insert_admin_teacher" on public.question_type_examples;
drop policy if exists "question_type_examples_update_admin_teacher" on public.question_type_examples;
drop policy if exists "question_type_examples_delete_admin_teacher" on public.question_type_examples;

create policy "question_type_examples_insert_admin_teacher"
on public.question_type_examples for insert
to authenticated
with check (public.current_user_can_manage_question_types());

create policy "question_type_examples_update_admin_teacher"
on public.question_type_examples for update
to authenticated
using (public.current_user_can_manage_question_types())
with check (public.current_user_can_manage_question_types());

create policy "question_type_examples_delete_admin_teacher"
on public.question_type_examples for delete
to authenticated
using (public.current_user_can_manage_question_types());
