create extension if not exists pgcrypto;

create table if not exists public.report_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  session_count integer not null default 0,
  sessions jsonb not null default '[]'::jsonb,
  quality jsonb not null default '{}'::jsonb
);

create index if not exists report_history_created_at_idx
  on public.report_history (created_at desc);

alter table public.report_history enable row level security;

drop policy if exists "No browser access to report history" on public.report_history;

create policy "No browser access to report history"
  on public.report_history
  for all
  using (false)
  with check (false);
