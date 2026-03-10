-- =============================================
-- Supabase Tables for Locations Sidebar
-- Circuit → Congregation → Location hierarchy
-- =============================================

-- 1. CIRCUITS
create table if not exists circuits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text default '',
  coordinator text not null,
  notes text default '',
  created_at timestamptz default now()
);

-- 2. CONGREGATIONS
create table if not exists congregations (
  id uuid primary key default gen_random_uuid(),
  circuit_id uuid not null references circuits(id) on delete restrict,
  name text not null,
  city text default '',
  overseers text[] default '{}',
  publisher_count int default 0,
  shifts_served int default 0,
  coverage_rate numeric default 0,
  created_at timestamptz default now()
);

-- 3. LOCATIONS
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  circuit_id uuid not null references circuits(id) on delete restrict,
  name text not null,
  category text not null check (category in ('Hospital', 'Plaza', 'Terminal', 'Mall')),
  city text not null default '',
  linked_congregations text[] default '{}',
  active boolean default true,
  age_group text default 'All ages',
  experience_level text default 'Any',
  max_publishers int default 3,
  notes text default '',
  created_at timestamptz default now()
);

-- 4. Enable Row Level Security (allow all for now via anon key)
alter table circuits enable row level security;
alter table congregations enable row level security;
alter table locations enable row level security;

create policy "Allow all access to circuits" on circuits for all using (true) with check (true);
create policy "Allow all access to congregations" on congregations for all using (true) with check (true);
create policy "Allow all access to locations" on locations for all using (true) with check (true);

-- 5. Indexes for common queries
create index if not exists idx_congregations_circuit on congregations(circuit_id);
create index if not exists idx_locations_circuit on locations(circuit_id);

-- =============================================
-- Members Table
-- Stores all member personal info, assignment,
-- demographics, and scheduling limits
-- =============================================

-- 6. MEMBERS
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  surname text not null,
  first_name text not null,
  middle_initial text default '',
  name text not null,                     -- computed display: "Surname, First M."
  circuit_id uuid not null references circuits(id) on delete restrict,
  congregation_id uuid not null references congregations(id) on delete restrict,
  date_of_birth date,
  age int,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  appearance text not null default 'Good' check (appearance in ('Excellent', 'Good', 'Average')),
  language text default '',
  -- contact
  phone text default '',
  email text default '',
  telegram_handle text default '',
  -- scheduling legacy fields
  age_group text default 'Adult' check (age_group in ('Youth', 'Adult', 'Senior')),
  experience text default 'New' check (experience in ('New', 'Intermediate', 'Experienced')),
  weekly_reservations int default 0,
  monthly_reservations int default 0,
  weekly_limit int default 2,
  monthly_limit int default 8,
  language_group text default '',
  preferred_days text[] default '{}',
  preferred_times text[] default '{}',
  preferred_locations text[] default '{}',
  created_at timestamptz default now()
);

-- 7. MEMBER AVAILABILITY
-- One row per member, stores Mon-Fri availability + weekend day counts
create table if not exists member_availability (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references members(id) on delete cascade,
  monday text not null default 'NA' check (monday in ('Morning','Half Day Morning','Half Day Afternoon','Afternoon','Full Day','Evening','NA')),
  tuesday text not null default 'NA' check (tuesday in ('Morning','Half Day Morning','Half Day Afternoon','Afternoon','Full Day','Evening','NA')),
  wednesday text not null default 'NA' check (wednesday in ('Morning','Half Day Morning','Half Day Afternoon','Afternoon','Full Day','Evening','NA')),
  thursday text not null default 'NA' check (thursday in ('Morning','Half Day Morning','Half Day Afternoon','Afternoon','Full Day','Evening','NA')),
  friday text not null default 'NA' check (friday in ('Morning','Half Day Morning','Half Day Afternoon','Afternoon','Full Day','Evening','NA')),
  saturday_days int not null default 0 check (saturday_days >= 0 and saturday_days <= 5),
  sunday_days int not null default 0 check (sunday_days >= 0 and sunday_days <= 5)
);

-- 8. RLS & policies for members
alter table members enable row level security;
alter table member_availability enable row level security;

create policy "Allow all access to members" on members for all using (true) with check (true);
create policy "Allow all access to member_availability" on member_availability for all using (true) with check (true);

-- 9. Indexes for member queries
create index if not exists idx_members_circuit on members(circuit_id);
create index if not exists idx_members_congregation on members(congregation_id);
create index if not exists idx_members_status on members(status);
create index if not exists idx_member_availability_member on member_availability(member_id);

-- =============================================
-- Timeslots Table
-- Reusable weekly time templates linked to locations
-- =============================================

-- 10. TIMESLOTS
create table if not exists timeslots (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time time not null,
  end_time time not null,
  required_publishers int not null default 2 check (required_publishers >= 2 and required_publishers <= 6),
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table timeslots enable row level security;
create policy "Allow all access to timeslots" on timeslots for all using (true) with check (true);

create index if not exists idx_timeslots_location on timeslots(location_id);
create index if not exists idx_timeslots_day on timeslots(day_of_week);
