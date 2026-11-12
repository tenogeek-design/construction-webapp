
-- CONSTRUCTION GROUP · OWNER assigns brigade/foreman and controls project lifecycle
-- Existing projects remain unchanged until OWNER takes action.
create or replace function public.owner_update_project_workflow(
  p_project_id uuid,
  p_action text,
  p_foreman_id uuid default null,
  p_brigade_id uuid default null
) returns text
language plpgsql
security definer
set search_path = public
as $body$
declare
  v_project public.projects%rowtype;
  v_brigade_foreman uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.app_user_roles
    where user_id=auth.uid() and role_code='owner' and revoked_at is null
  ) then raise exception 'OWNER role required'; end if;

  select * into v_project from public.projects where id=p_project_id for update;
  if not found then raise exception 'Project not found'; end if;

  if p_action='assign' then
    if p_foreman_id is not null and not exists (
      select 1 from public.employees where id=p_foreman_id and status='active'
    ) then raise exception 'Foreman employee not active'; end if;

    if p_brigade_id is not null then
      select foreman_id into v_brigade_foreman from public.brigades
      where id=p_brigade_id and status='active';
      if not found then raise exception 'Brigade not active'; end if;
      if p_foreman_id is not null and v_brigade_foreman is not null
        and p_foreman_id <> v_brigade_foreman then
        raise exception 'Foreman must match brigade leader';
      end if;
    end if;

    if v_project.status in ('completed','cancelled') then
      raise exception 'Archived project cannot be reassigned';
    end if;
    update public.projects
      set foreman_id=p_foreman_id,brigade_id=p_brigade_id,updated_at=now()
      where id=p_project_id;
    update public.project_brigades
      set removed_at=current_date
      where project_id=p_project_id and removed_at is null
        and (p_brigade_id is null or brigade_id <> p_brigade_id);
    if p_brigade_id is not null and not exists (
      select 1 from public.project_brigades
      where project_id=p_project_id and brigade_id=p_brigade_id and removed_at is null
    ) then
      insert into public.project_brigades(project_id,brigade_id,assigned_at)
      values(p_project_id,p_brigade_id,current_date);
    end if;
    return 'assigned';

  elsif p_action='start' then
    if v_project.status<>'planned' then raise exception 'Only planned projects can start'; end if;
    if v_project.foreman_id is null or v_project.brigade_id is null then
      raise exception 'Assign a foreman and brigade before starting'; end if;
    update public.projects set status='active',updated_at=now() where id=p_project_id;
    return 'active';

  elsif p_action='pause' then
    if v_project.status<>'active' then raise exception 'Only active projects can pause'; end if;
    update public.projects set status='paused',updated_at=now() where id=p_project_id;
    return 'paused';

  elsif p_action='resume' then
    if v_project.status<>'paused' then raise exception 'Only paused projects can resume'; end if;
    update public.projects set status='active',updated_at=now() where id=p_project_id;
    return 'active';

  elsif p_action='complete' then
    if v_project.status not in ('active','paused') then
      raise exception 'Only started projects can complete'; end if;
    update public.projects set status='completed',updated_at=now() where id=p_project_id;
    return 'completed';

  else raise exception 'Unsupported action'; end if;
end
$body$;
revoke all on function public.owner_update_project_workflow(uuid,text,uuid,uuid) from public,anon;
grant execute on function public.owner_update_project_workflow(uuid,text,uuid,uuid) to authenticated;
