
-- CONSTRUCTION GROUP / Object approval workflow
-- Run once in Supabase SQL Editor. This does not modify existing project records.
create table if not exists public.foreman_object_proposals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  name text not null check (char_length(name) between 1 and 160),
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
