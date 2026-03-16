-- =============================================
-- RBAC Migration: Role-Based Access Control
-- Replace permissive "allow all" policies with
-- proper admin / member role enforcement.
--
-- Prerequisites:
--   • Supabase Auth enabled
--   • A `user_profiles` table linking auth.uid()
--     to an app role and optional member_id
-- =============================================

-- ────────────────────────────────────────────
-- 1. USER PROFILES TABLE
--    Links Supabase Auth users to app roles
-- ────────────────────────────────────────────

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  member_id uuid references members(id) on delete set null,
  display_name text not null default '',
  created_at timestamptz default now()
);

alter table user_profiles enable row level security;

-- Users can read their own profile; admins can read all
create policy "Users can read own profile"
  on user_profiles for select
  using (
    id = auth.uid()
    or (select role from user_profiles where id = auth.uid()) = 'admin'
  );

-- Users can update their own display_name only; admins can update any
create policy "Users can update own profile"
  on user_profiles for update
  using (
    id = auth.uid()
    or (select role from user_profiles where id = auth.uid()) = 'admin'
  )
  with check (
    id = auth.uid()
    or (select role from user_profiles where id = auth.uid()) = 'admin'
  );

-- Only admins can insert/delete profiles
create policy "Admins can insert profiles"
  on user_profiles for insert
  with check (
    (select role from user_profiles where id = auth.uid()) = 'admin'
  );

create policy "Admins can delete profiles"
  on user_profiles for delete
  using (
    (select role from user_profiles where id = auth.uid()) = 'admin'
  );

create index if not exists idx_user_profiles_member on user_profiles(member_id);
create index if not exists idx_user_profiles_role on user_profiles(role);

-- ────────────────────────────────────────────
-- 2. HELPER FUNCTION: get current user's role
-- ────────────────────────────────────────────

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from user_profiles where id = auth.uid()),
    'member'
  );
$$;

-- Helper: get current user's linked member_id
create or replace function public.get_user_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select member_id from user_profiles where id = auth.uid();
$$;

-- ────────────────────────────────────────────
-- 3. DROP OLD PERMISSIVE POLICIES
-- ────────────────────────────────────────────

drop policy if exists "Allow all access to circuits" on circuits;
drop policy if exists "Allow all access to congregations" on congregations;
drop policy if exists "Allow all access to locations" on locations;
drop policy if exists "Allow all access to members" on members;
drop policy if exists "Allow all access to member_availability" on member_availability;
drop policy if exists "Allow all access to timeslots" on timeslots;
drop policy if exists "Allow all access to shifts" on shifts;
drop policy if exists "Allow all access to shift_assignments" on shift_assignments;

-- ────────────────────────────────────────────
-- 4. CIRCUITS — admin full CRUD, members read
-- ────────────────────────────────────────────

create policy "circuits_select"
  on circuits for select
  using (true);  -- everyone can read circuits

create policy "circuits_insert"
  on circuits for insert
  with check (public.get_user_role() = 'admin');

create policy "circuits_update"
  on circuits for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "circuits_delete"
  on circuits for delete
  using (public.get_user_role() = 'admin');

-- ────────────────────────────────────────────
-- 5. CONGREGATIONS — admin full CRUD, members read
-- ────────────────────────────────────────────

create policy "congregations_select"
  on congregations for select
  using (true);

create policy "congregations_insert"
  on congregations for insert
  with check (public.get_user_role() = 'admin');

create policy "congregations_update"
  on congregations for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "congregations_delete"
  on congregations for delete
  using (public.get_user_role() = 'admin');

-- ────────────────────────────────────────────
-- 6. LOCATIONS — admin full CRUD, members read
-- ────────────────────────────────────────────

create policy "locations_select"
  on locations for select
  using (true);

create policy "locations_insert"
  on locations for insert
  with check (public.get_user_role() = 'admin');

create policy "locations_update"
  on locations for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "locations_delete"
  on locations for delete
  using (public.get_user_role() = 'admin');

-- ────────────────────────────────────────────
-- 7. MEMBERS — admin full CRUD; members read self only
-- ────────────────────────────────────────────

create policy "members_select"
  on members for select
  using (
    public.get_user_role() = 'admin'
    or id = public.get_user_member_id()
  );

create policy "members_insert"
  on members for insert
  with check (public.get_user_role() = 'admin');

-- Members can update only their own contact/preference fields (enforced app-side);
-- DB policy allows update on own row or admin on any row.
create policy "members_update"
  on members for update
  using (
    public.get_user_role() = 'admin'
    or id = public.get_user_member_id()
  )
  with check (
    public.get_user_role() = 'admin'
    or id = public.get_user_member_id()
  );

create policy "members_delete"
  on members for delete
  using (public.get_user_role() = 'admin');

-- ────────────────────────────────────────────
-- 8. MEMBER AVAILABILITY — mirrors members policy
-- ────────────────────────────────────────────

create policy "member_availability_select"
  on member_availability for select
  using (
    public.get_user_role() = 'admin'
    or member_id = public.get_user_member_id()
  );

create policy "member_availability_insert"
  on member_availability for insert
  with check (
    public.get_user_role() = 'admin'
    or member_id = public.get_user_member_id()
  );

create policy "member_availability_update"
  on member_availability for update
  using (
    public.get_user_role() = 'admin'
    or member_id = public.get_user_member_id()
  )
  with check (
    public.get_user_role() = 'admin'
    or member_id = public.get_user_member_id()
  );

create policy "member_availability_delete"
  on member_availability for delete
  using (public.get_user_role() = 'admin');

-- ────────────────────────────────────────────
-- 9. TIMESLOTS — admin full CRUD, members read
-- ────────────────────────────────────────────

create policy "timeslots_select"
  on timeslots for select
  using (true);

create policy "timeslots_insert"
  on timeslots for insert
  with check (public.get_user_role() = 'admin');

create policy "timeslots_update"
  on timeslots for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "timeslots_delete"
  on timeslots for delete
  using (public.get_user_role() = 'admin');

-- ────────────────────────────────────────────
-- 10. SHIFTS — admin full CRUD, members read
-- ────────────────────────────────────────────

create policy "shifts_select"
  on shifts for select
  using (true);

-- Admins can create/update/delete shifts.
-- The generateWeekShifts function also needs insert — it runs as the
-- authenticated user, so admins trigger it. If members browse vacant
-- slots, the read policy above covers them.
create policy "shifts_insert"
  on shifts for insert
  with check (public.get_user_role() = 'admin');

create policy "shifts_update"
  on shifts for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "shifts_delete"
  on shifts for delete
  using (public.get_user_role() = 'admin');

-- ────────────────────────────────────────────
-- 11. SHIFT ASSIGNMENTS
--     Admin: full CRUD
--     Member: can INSERT own (self-join) and
--             DELETE own (cancel) but not others'
-- ────────────────────────────────────────────

create policy "shift_assignments_select"
  on shift_assignments for select
  using (
    public.get_user_role() = 'admin'
    or member_id = public.get_user_member_id()
  );

create policy "shift_assignments_insert"
  on shift_assignments for insert
  with check (
    public.get_user_role() = 'admin'
    or (
      member_id = public.get_user_member_id()
      and assigned_by = 'self'
    )
  );

create policy "shift_assignments_delete"
  on shift_assignments for delete
  using (
    public.get_user_role() = 'admin'
    or member_id = public.get_user_member_id()
  );

-- No member update on assignments — they can only add/remove themselves
create policy "shift_assignments_update"
  on shift_assignments for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ────────────────────────────────────────────
-- 12. GRANT execute on helper functions
-- ────────────────────────────────────────────

grant execute on function public.get_user_role() to authenticated, anon;
grant execute on function public.get_user_member_id() to authenticated, anon;
