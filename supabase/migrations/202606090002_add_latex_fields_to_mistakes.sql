alter table public.mistakes
add column if not exists input_type text not null default 'plain_text',
add column if not exists raw_text text,
add column if not exists latex_content text;

update public.mistakes
set raw_text = stem
where raw_text is null;

alter table public.mistakes
alter column raw_text set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mistakes_input_type_check'
      and conrelid = 'public.mistakes'::regclass
  ) then
    alter table public.mistakes
    add constraint mistakes_input_type_check
    check (input_type in ('plain_text', 'latex'));
  end if;
end;
$$;
