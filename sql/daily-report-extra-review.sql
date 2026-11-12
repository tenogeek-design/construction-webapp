CREATE OR REPLACE FUNCTION public.review_daily_work_report(p_report_id uuid, p_action text, p_note text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_user uuid:=auth.uid();
 v_report public.daily_work_reports%rowtype;
 v_row record;
begin
 if v_user is null or not exists(
   select 1 from public.app_user_roles
   where user_id=v_user and role_code='owner' and revoked_at is null
 ) then raise exception 'OWNER role required'; end if;
 if p_action not in ('approve','return','reject') then raise exception 'Invalid action'; end if;
 if p_action in ('return','reject') and length(trim(coalesce(p_note,'')))=0 then
   raise exception 'Enter a reason'; end if;
 select * into v_report from public.daily_work_reports
  where id=p_report_id for update;
 if not found or v_report.status<>'submitted' then
  raise exception 'Report is not waiting for review'; end if;
 if p_action='approve' then
  if not exists(select 1 from public.daily_work_report_items where report_id=p_report_id)
    and not exists(select 1 from public.daily_work_report_extras where report_id=p_report_id)
    then raise exception 'Report contains no work entries'; end if;
  for v_row in select position_id,quantity from public.daily_work_report_items
    where report_id=p_report_id order by position_id loop
    update public.project_work_positions
      set completed_quantity=coalesce(completed_quantity,0)+v_row.quantity
    where id=v_row.position_id and coalesce(completed_quantity,0)+v_row.quantity<=quantity;
    if not found then raise exception 'Completed quantity exceeds the plan; return the report for correction'; end if;
  end loop;
 end if;
 update public.daily_work_reports
 set status=case p_action when 'approve' then 'approved' when 'return' then 'changes_requested' else 'rejected' end,
     reviewed_by=v_user,reviewed_at=now(),
     review_note=left(nullif(trim(coalesce(p_note,'')),''),1000),
     cash_status=case when p_action='reject' and cash_requested then 'rejected' else cash_status end,
     cash_note=case when p_action='reject' and cash_requested then 'Report rejected' else cash_note end,
     cash_reviewed_by=case when p_action='reject' and cash_requested then v_user else cash_reviewed_by end,
     cash_reviewed_at=case when p_action='reject' and cash_requested then now() else cash_reviewed_at end,
     updated_at=now()
 where id=p_report_id;
 insert into public.daily_work_report_history(report_id,event,performed_by,details)
 values(p_report_id,case p_action when 'approve' then 'work_approved' when 'return' then 'work_returned' else 'work_rejected' end,
        v_user,jsonb_build_object('note',p_note,
         'progress_applied',p_action='approve' and exists(
           select 1 from public.daily_work_report_items where report_id=p_report_id),
         'extra_scope_automatically_approved',false));
 return p_action;
end $function$
;
revoke all on function public.review_daily_work_report(uuid,text,text) from public,anon;
grant execute on function public.review_daily_work_report(uuid,text,text) to authenticated;
