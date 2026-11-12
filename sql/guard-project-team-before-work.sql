-- Prevent active or paused work without an assigned brigade and responsible foreman.
-- Non-destructive: does not rewrite existing project rows.
create or replace function public.validate_project_assignment_before_work()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if NEW.status in ('active','paused')
     and (NEW.foreman_id is null or NEW.brigade_id is null) then
    raise exception 'Before work starts, assign both a responsible foreman and a brigade';
  end if;
  return NEW;
end;
$$;
revoke all on function public.validate_project_assignment_before_work() from public,anon,authenticated;
drop trigger if exists trg_validate_project_assignment_before_work on public.projects;
create trigger trg_validate_project_assignment_before_work
before insert or update on public.projects
for each row
execute function public.validate_project_assignment_before_work();
