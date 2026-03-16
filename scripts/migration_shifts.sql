-- =============================================
-- Migration: Add shifts + shift_assignments tables
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================

-- 1. SHIFTS — concrete shift instances for a specific date
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  timeslot_id uuid references timeslots(id) on delete set null,
  location_id uuid not null references locations(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  required_count int not null default 2 check (required_count >= 1 and required_count <= 10),
  status text not null default 'open' check (status in ('open', 'partial', 'filled')),
  created_at timestamptz default now(),
  unique(location_id, date, start_time, end_time)
);

alter table shifts enable row level security;
create policy "Allow all access to shifts" on shifts for all using (true) with check (true);

create index if not exists idx_shifts_location on shifts(location_id);
create index if not exists idx_shifts_date on shifts(date);
create index if not exists idx_shifts_location_date on shifts(location_id, date);

-- 2. SHIFT ASSIGNMENTS — one row per member assigned to a shift
create table if not exists shift_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  assigned_by text not null default 'admin' check (assigned_by in ('admin', 'self')),
  assigned_at timestamptz default now(),
  unique(shift_id, member_id)
);

alter table shift_assignments enable row level security;
create policy "Allow all access to shift_assignments" on shift_assignments for all using (true) with check (true);

create index if not exists idx_shift_assignments_shift on shift_assignments(shift_id);
create index if not exists idx_shift_assignments_member on shift_assignments(member_id);
