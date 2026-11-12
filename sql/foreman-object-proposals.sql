
-- CONSTRUCTION GROUP / Object approval workflow
-- Run once in Supabase SQL Editor. This does not modify existing project records.
create table if not exists public.foreman_object_proposals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  name text not null check (char_length(name) between 1 and 160),
  city text not null default 'Warszawa' check (char_length(city) between 1 and 100),
  address text not null check (char_length(address) between 1 and 300),
  start_date date,
  end_date date,
  description text,
  stages jsonb not null default '[]'::jsonb,
  estimated_total numeric(14,2) not null default 0 check (estimated_total >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  owner_comment text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  project_id uuid references public.projects(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_proposal_dates check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists foreman_proposals_by_user on public.foreman_object_proposals(created_by,created_at desc);
create index if not exists foreman_proposals_by_status on public.foreman_object_proposals(status,created_at desc);
alter table public.foreman_object_proposals enable row level security;
-- Deliberately no direct client policies: all access via authenticated role-checked server API.
revoke all on public.foreman_object_proposals from anon, authenticated;

-- Atomic approval: an approved proposal creates ONE planned project.
create or replace function public.review_foreman_object_proposal(
  p_proposal_id uuid,
  p_decision text,
  p_comment text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.foreman_object_proposals%rowtype;
  v_project_id uuid;
begin
  if not exists (
    select 1 from public.app_user_roles
    where user_id=auth.uid() and role_code='owner' and revoked_at is null
  ) then
    raise exception 'OWNER role required';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'Invalid decision';
  end if;
  select * into v_proposal from public.foreman_object_proposals
    where id=p_proposal_id for update;
  if not found then raise exception 'Proposal not found'; end if;
  if v_proposal.status<>'pending' then
    raise exception 'Proposal already reviewed';
  end if;
  if p_decision='rejected' and nullif(trim(p_comment),'') is null then
    raise exception 'Rejection reason required';
  end if;
  if p_decision='approved' then
    insert into public.projects(name,city,street,status,start_date,end_date,description,currency)
      values (v_proposal.name,v_proposal.city,v_proposal.address,'planned',
              v_proposal.start_date,v_proposal.end_date,v_proposal.description,'PLN')
      returning id into v_project_id;
  end if;
  update public.foreman_object_proposals
    set status=p_decision,
        owner_comment=left(p_comment,2000),
        reviewed_by=auth.uid(),
        reviewed_at=now(),
        project_id=v_project_id,
        updated_at=now()
    where id=p_proposal_id;
  return coalesce(v_project_id,p_proposal_id);
end $$;
revoke all on function public.review_foreman_object_proposal(uuid,text,text) from public,anon;
grant execute on function public.review_foreman_object_proposal(uuid,text,text) to authenticated;
