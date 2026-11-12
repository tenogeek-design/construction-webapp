
create table if not exists public.daily_work_report_extras (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.daily_work_reports(id) on delete cascade,
 source text not null check(source in ('catalog','manual')),
 catalog_key text,
 work_name text not null check(char_length(work_name) between 2 and 160),
 unit text not null check(char_length(unit) between 1 and 24),
 quantity numeric(14,2) not null check(quantity>0 and quantity<=1000000),
 unit_price numeric(14,2) check(unit_price is null or (unit_price>=0 and unit_price<=10000000)),
 created_at timestamptz not null default now()
);
create index if not exists daily_work_report_extras_report_idx on public.daily_work_report_extras(report_id);
alter table public.daily_work_report_extras enable row level security;
revoke all on public.daily_work_report_extras from anon,authenticated;

CREATE OR REPLACE FUNCTION public.save_daily_work_report_v2(p_report_id uuid, p_project_id uuid, p_work_date date, p_description text, p_items jsonb, p_cash_requested boolean, p_cash_amount numeric, p_cash_purpose text, p_submit boolean, p_extras jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); v_employee uuid; v_project public.projects%rowtype;
 v_report public.daily_work_reports%rowtype; v_id uuid; v_item jsonb; v_pos uuid; v_qty numeric;
 v_extra jsonb; v_kind text; v_label text; v_unit text; v_price numeric; v_key text;
begin
 if v_user is null then raise exception 'Login required'; end if;
 if not exists(select 1 from public.app_user_roles where user_id=v_user and role_code='foreman' and revoked_at is null)
  then raise exception 'Foreman role required'; end if;
 select id into v_employee from public.employees where user_id=v_user and status='active';
 select * into v_project from public.projects where id=p_project_id;
 if not found or v_project.foreman_id is distinct from v_employee or v_employee is null
  then raise exception 'Object is not assigned to this foreman'; end if;
 if v_project.status not in ('active','paused') or (p_submit and v_project.status<>'active')
  then raise exception 'Object must be active to submit a report'; end if;
 if p_work_date is null or p_work_date>current_date or p_work_date<current_date-120
  then raise exception 'Invalid work date'; end if;
 if length(coalesce(p_description,''))>2000 then raise exception 'Description too long'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>40
  then raise exception 'Invalid work entries'; end if;
 if p_extras is null or jsonb_typeof(p_extras)<>'array' or jsonb_array_length(p_extras)>40
  or jsonb_array_length(p_items)+jsonb_array_length(p_extras)>40 then
  raise exception 'Too many work entries';
 end if;
 if p_submit and jsonb_array_length(p_items)=0 and jsonb_array_length(p_extras)=0
  then raise exception 'Add at least one work entry'; end if;
 if coalesce(p_cash_requested,false) and (p_cash_amount is null or p_cash_amount<=0 or p_cash_amount>1000000 or
  length(trim(coalesce(p_cash_purpose,'')))=0 or length(p_cash_purpose)>500)
  then raise exception 'Enter an amount and purpose for the cash request'; end if;

 if p_report_id is null then
  insert into public.daily_work_reports(project_id,work_date,created_by,description,status)
  values(p_project_id,p_work_date,v_user,'','draft') returning id into v_id;
 else
  select * into v_report from public.daily_work_reports where id=p_report_id for update;
  if not found or v_report.project_id<>p_project_id or v_report.created_by<>v_user
   or v_report.status not in ('draft','rejected','changes_requested')
   then raise exception 'Draft cannot be edited'; end if;
  v_id:=p_report_id;
 end if;

 update public.daily_work_reports set work_date=p_work_date,description=left(coalesce(p_description,''),2000),
  cash_requested=coalesce(p_cash_requested,false),
  cash_requested_amount=case when coalesce(p_cash_requested,false) then round(p_cash_amount,2) else null end,
  cash_purpose=case when coalesce(p_cash_requested,false) then left(trim(p_cash_purpose),500) else null end,
  cash_status=case when coalesce(p_cash_requested,false) then 'pending' else 'none' end,
  cash_approved_amount=null,cash_note=null,cash_reviewed_by=null,cash_reviewed_at=null,
  status=case when p_submit then 'submitted' else 'draft' end,
  submitted_at=case when p_submit then now() else null end,
  reviewed_by=null,reviewed_at=null,review_note=null,updated_at=now()
 where id=v_id;

 delete from public.daily_work_report_items where report_id=v_id;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_pos:=(v_item->>'positionId')::uuid;
  v_qty:=(v_item->>'quantity')::numeric;
  if v_qty is null or v_qty<=0 or v_qty>1000000 then raise exception 'Invalid quantity'; end if;
  if not exists(select 1 from public.project_work_positions pos
    join public.project_work_stages st on st.id=pos.stage_id
    where pos.id=v_pos and st.project_id=p_project_id)
  then raise exception 'Work position not part of this object'; end if;
  insert into public.daily_work_report_items(report_id,position_id,quantity)
   values(v_id,v_pos,round(v_qty,2));
 end loop;
 delete from public.daily_work_report_extras where report_id=v_id;
 for v_extra in select value from jsonb_array_elements(p_extras) loop
   v_kind:=v_extra->>'source';
   v_label:=trim(coalesce(v_extra->>'name',''));
   v_unit:=trim(coalesce(v_extra->>'unit',''));
   v_key:=nullif(trim(coalesce(v_extra->>'catalogKey','')),'');
   v_qty:=(v_extra->>'quantity')::numeric;
   v_price:=case when nullif(trim(coalesce(v_extra->>'price','')),'') is null
       then null else (v_extra->>'price')::numeric end;
   if v_kind not in ('catalog','manual') or length(v_label)<2 or length(v_label)>160
     or length(v_unit)<1 or length(v_unit)>24 or v_qty is null or v_qty<=0 or v_qty>1000000
     or (v_price is not null and (v_price<0 or v_price>10000000))
     or (v_key is not null and length(v_key)>80) then
       raise exception 'Invalid extra work position'; end if;
   insert into public.daily_work_report_extras
     (report_id,source,catalog_key,work_name,unit,quantity,unit_price)
     values(v_id,v_kind,v_key,v_label,v_unit,round(v_qty,2),
       case when v_price is null then null else round(v_price,2) end);
 end loop;
 if p_submit and not exists(select 1 from public.daily_work_report_photos where report_id=v_id)
  then raise exception 'Attach at least one photo before submitting'; end if;
 insert into public.daily_work_report_history(report_id,event,performed_by,details)
 values(v_id,case when p_submit then 'submitted' else 'draft_saved' end,v_user,
 jsonb_build_object('cash_requested',coalesce(p_cash_requested,false),'cash_amount',p_cash_amount,'items',jsonb_array_length(p_items)));
 return v_id;
end $function$

;
revoke all on function public.save_daily_work_report_v2(uuid,uuid,date,text,jsonb,boolean,numeric,text,boolean,jsonb) from public,anon;
grant execute on function public.save_daily_work_report_v2(uuid,uuid,date,text,jsonb,boolean,numeric,text,boolean,jsonb) to authenticated;
