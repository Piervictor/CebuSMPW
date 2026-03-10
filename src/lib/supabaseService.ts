/**
 * Supabase Service – Circuits, Congregations, Locations, Members
 * Maps between Supabase snake_case columns and app camelCase interfaces.
 */

import { supabase } from './supabase';
import type {
  Circuit, Congregation, Location, Member, MemberAvailability, Timeslot, DayOfWeek,
  LocationCategory, AgeGroup, ExperienceLevel,
  WeekdayAvailability, MemberStatus, MemberAppearance,
} from '../app/data/mockData';

// ─── Row types (what Supabase returns) ──────────────────────

interface CircuitRow {
  id: string;
  name: string;
  city: string;
  coordinator: string;
  notes: string;
}

interface CongregationRow {
  id: string;
  circuit_id: string;
  name: string;
  city: string;
  overseers: string[];
  publisher_count: number;
  shifts_served: number;
  coverage_rate: number;
}

interface LocationRow {
  id: string;
  circuit_id: string;
  name: string;
  category: string;
  city: string;
  linked_congregations: string[];
  active: boolean;
  age_group: string;
  experience_level: string;
  max_publishers: number;
  notes: string;
}

interface MemberRow {
  id: string;
  surname: string;
  first_name: string;
  middle_initial: string;
  name: string;
  circuit_id: string;
  congregation_id: string;
  date_of_birth: string | null;
  age: number | null;
  status: string;
  appearance: string;
  language: string;
  phone: string;
  email: string;
  telegram_handle: string;
  age_group: string;
  experience: string;
  weekly_reservations: number;
  monthly_reservations: number;
  weekly_limit: number;
  monthly_limit: number;
  language_group: string;
  preferred_days: string[];
  preferred_times: string[];
  preferred_locations: string[];
}

interface MemberAvailabilityRow {
  id: string;
  member_id: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday_days: number;
  sunday_days: number;
}

// ─── Mappers ────────────────────────────────────────────────

function toCircuit(row: CircuitRow): Circuit {
  return {
    id: row.id,
    name: row.name,
    city: row.city || undefined,
    coordinator: row.coordinator,
    notes: row.notes || undefined,
  };
}

function toCongregation(row: CongregationRow): Congregation {
  return {
    id: row.id,
    circuitId: row.circuit_id,
    name: row.name,
    city: row.city || undefined,
    overseers: row.overseers || [],
    publisherCount: row.publisher_count ?? 0,
    shiftsServed: row.shifts_served ?? 0,
    coverageRate: row.coverage_rate ?? 0,
  };
}

function toLocation(row: LocationRow): Location {
  return {
    id: row.id,
    circuitId: row.circuit_id,
    name: row.name,
    category: row.category as LocationCategory,
    city: row.city,
    linkedCongregations: row.linked_congregations || [],
    active: row.active,
    ageGroup: (row.age_group as AgeGroup) || undefined,
    experienceLevel: (row.experience_level as ExperienceLevel) || undefined,
    maxPublishers: row.max_publishers ?? undefined,
    notes: row.notes || '',
  };
}

const DEFAULT_AVAILABILITY: MemberAvailability = {
  monday: 'NA', tuesday: 'NA', wednesday: 'NA', thursday: 'NA', friday: 'NA',
  saturdayDays: 0, sundayDays: 0,
};

function toAvailability(row: MemberAvailabilityRow | null): MemberAvailability {
  if (!row) return { ...DEFAULT_AVAILABILITY };
  return {
    monday: row.monday as WeekdayAvailability,
    tuesday: row.tuesday as WeekdayAvailability,
    wednesday: row.wednesday as WeekdayAvailability,
    thursday: row.thursday as WeekdayAvailability,
    friday: row.friday as WeekdayAvailability,
    saturdayDays: row.saturday_days ?? 0,
    sundayDays: row.sunday_days ?? 0,
  };
}

function toMember(row: MemberRow & { member_availability?: MemberAvailabilityRow | MemberAvailabilityRow[] | null }): Member {
  // Supabase returns a single object for 1:1 (UNIQUE FK) or an array — handle both
  const rawAvail = row.member_availability;
  const availRow: MemberAvailabilityRow | null = Array.isArray(rawAvail)
    ? rawAvail[0] ?? null
    : rawAvail ?? null;
  return {
    id: row.id,
    surname: row.surname,
    firstName: row.first_name,
    middleInitial: row.middle_initial || undefined,
    name: row.name,
    circuitId: row.circuit_id,
    congregationId: row.congregation_id,
    dateOfBirth: row.date_of_birth || undefined,
    age: row.age ?? undefined,
    status: (row.status as MemberStatus) || 'Active',
    appearance: (row.appearance as MemberAppearance) || 'Good',
    language: row.language || undefined,
    availability: toAvailability(availRow),
    phone: row.phone || undefined,
    email: row.email || undefined,
    telegramHandle: row.telegram_handle || undefined,
    ageGroup: (row.age_group as Member['ageGroup']) || 'Adult',
    experience: (row.experience as Member['experience']) || 'New',
    weeklyReservations: row.weekly_reservations ?? 0,
    monthlyReservations: row.monthly_reservations ?? 0,
    weeklyLimit: row.weekly_limit ?? 2,
    monthlyLimit: row.monthly_limit ?? 8,
    languageGroup: row.language_group || undefined,
    preferredDays: row.preferred_days || [],
    preferredTimes: row.preferred_times || [],
    preferredLocations: row.preferred_locations || [],
  };
}

// ─── Circuit Service ────────────────────────────────────────

export const supabaseCircuitService = {
  async getAll(): Promise<Circuit[]> {
    const { data, error } = await supabase.from('circuits').select('*').order('name');
    if (error) { console.error('Supabase circuits.getAll error:', error); throw new Error(error.message); }
    return (data as CircuitRow[]).map(toCircuit);
  },

  async create(circuit: Omit<Circuit, 'id'>): Promise<Circuit> {
    const payload = {
      name: circuit.name,
      city: circuit.city ?? '',
      coordinator: circuit.coordinator,
      notes: circuit.notes ?? '',
    };
    console.log('Supabase circuits.create payload:', payload);
    const { data, error } = await supabase
      .from('circuits')
      .insert(payload)
      .select()
      .single();
    if (error) { console.error('Supabase circuits.create error:', error); throw new Error(error.message); }
    return toCircuit(data as CircuitRow);
  },

  async update(id: string, updates: Partial<Circuit>): Promise<Circuit> {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.coordinator !== undefined) payload.coordinator = updates.coordinator;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { data, error } = await supabase
      .from('circuits')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCircuit(data as CircuitRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('circuits').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ─── Congregation Service ───────────────────────────────────

export const supabaseCongregationService = {
  async getAll(): Promise<Congregation[]> {
    const { data, error } = await supabase.from('congregations').select('*').order('name');
    if (error) { console.error('Supabase congregations.getAll error:', error); throw new Error(error.message); }
    return (data as CongregationRow[]).map(toCongregation);
  },

  async create(congregation: Omit<Congregation, 'id'>): Promise<Congregation> {
    const payload = {
      circuit_id: congregation.circuitId,
      name: congregation.name,
      city: congregation.city ?? '',
      overseers: congregation.overseers || [],
      publisher_count: congregation.publisherCount ?? 0,
      shifts_served: congregation.shiftsServed ?? 0,
      coverage_rate: congregation.coverageRate ?? 0,
    };
    console.log('Supabase congregations.create payload:', payload);
    const { data, error } = await supabase
      .from('congregations')
      .insert(payload)
      .select()
      .single();
    if (error) { console.error('Supabase congregations.create error:', error); throw new Error(error.message); }
    return toCongregation(data as CongregationRow);
  },

  async update(id: string, updates: Partial<Congregation>): Promise<Congregation> {
    const payload: Record<string, unknown> = {};
    if (updates.circuitId !== undefined) payload.circuit_id = updates.circuitId;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.overseers !== undefined) payload.overseers = updates.overseers;
    if (updates.publisherCount !== undefined) payload.publisher_count = updates.publisherCount;
    if (updates.shiftsServed !== undefined) payload.shifts_served = updates.shiftsServed;
    if (updates.coverageRate !== undefined) payload.coverage_rate = updates.coverageRate;

    const { data, error } = await supabase
      .from('congregations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCongregation(data as CongregationRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('congregations').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ─── Location Service ───────────────────────────────────────

export const supabaseLocationService = {
  async getAll(): Promise<Location[]> {
    const { data, error } = await supabase.from('locations').select('*').order('name');
    if (error) { console.error('Supabase locations.getAll error:', error); throw new Error(error.message); }
    return (data as LocationRow[]).map(toLocation);
  },

  async create(location: Omit<Location, 'id'>): Promise<Location> {
    const payload = {
      circuit_id: location.circuitId,
      name: location.name,
      category: location.category,
      city: location.city,
      linked_congregations: location.linkedCongregations || [],
      active: location.active ?? true,
      age_group: location.ageGroup ?? 'All ages',
      experience_level: location.experienceLevel ?? 'Any',
      max_publishers: location.maxPublishers ?? 3,
      notes: location.notes || '',
    };
    console.log('Supabase locations.create payload:', payload);
    const { data, error } = await supabase
      .from('locations')
      .insert(payload)
      .select()
      .single();
    if (error) { console.error('Supabase locations.create error:', error); throw new Error(error.message); }
    return toLocation(data as LocationRow);
  },

  async update(id: string, updates: Partial<Location>): Promise<Location> {
    const payload: Record<string, unknown> = {};
    if (updates.circuitId !== undefined) payload.circuit_id = updates.circuitId;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.linkedCongregations !== undefined) payload.linked_congregations = updates.linkedCongregations;
    if (updates.active !== undefined) payload.active = updates.active;
    if (updates.ageGroup !== undefined) payload.age_group = updates.ageGroup;
    if (updates.experienceLevel !== undefined) payload.experience_level = updates.experienceLevel;
    if (updates.maxPublishers !== undefined) payload.max_publishers = updates.maxPublishers;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { data, error } = await supabase
      .from('locations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toLocation(data as LocationRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ─── Member Service ─────────────────────────────────────────

export const supabaseMemberService = {
  /**
   * Get all members with their availability (joined)
   */
  async getAll(): Promise<Member[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*, member_availability(*)')
      .order('surname');
    if (error) { console.error('Supabase members.getAll error:', error); throw new Error(error.message); }
    // Debug: log raw availability join data for first member
    if (data && data.length > 0) {
      console.log('[supabaseService] getAll — sample member_availability:', (data[0] as Record<string, unknown>).member_availability);
    }
    return (data as (MemberRow & { member_availability: MemberAvailabilityRow | MemberAvailabilityRow[] })[]).map(toMember);
  },

  /**
   * Create a new member and its availability row in a single transaction
   */
  async create(member: Omit<Member, 'id'>): Promise<Member> {
    // 1. Insert member row
    const memberPayload = {
      surname: member.surname,
      first_name: member.firstName,
      middle_initial: member.middleInitial ?? '',
      name: member.name,
      circuit_id: member.circuitId,
      congregation_id: member.congregationId,
      date_of_birth: member.dateOfBirth || null,
      age: member.age ?? null,
      status: member.status ?? 'Active',
      appearance: member.appearance ?? 'Good',
      language: member.language ?? '',
      phone: member.phone ?? '',
      email: member.email ?? '',
      telegram_handle: member.telegramHandle ?? '',
      age_group: member.ageGroup ?? 'Adult',
      experience: member.experience ?? 'New',
      weekly_reservations: member.weeklyReservations ?? 0,
      monthly_reservations: member.monthlyReservations ?? 0,
      weekly_limit: member.weeklyLimit ?? 2,
      monthly_limit: member.monthlyLimit ?? 8,
      language_group: member.languageGroup ?? '',
      preferred_days: member.preferredDays ?? [],
      preferred_times: member.preferredTimes ?? [],
      preferred_locations: member.preferredLocations ?? [],
    };

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert(memberPayload)
      .select()
      .single();
    if (memberError) { console.error('Supabase members.create error:', memberError); throw new Error(memberError.message); }

    // 2. Insert availability row linked to new member
    console.log('[supabaseService] create member — availability from form:', member.availability);
    const avail = member.availability ?? DEFAULT_AVAILABILITY;
    const availPayload = {
      member_id: (memberData as MemberRow).id,
      monday: avail.monday ?? 'NA',
      tuesday: avail.tuesday ?? 'NA',
      wednesday: avail.wednesday ?? 'NA',
      thursday: avail.thursday ?? 'NA',
      friday: avail.friday ?? 'NA',
      saturday_days: avail.saturdayDays ?? 0,
      sunday_days: avail.sundayDays ?? 0,
    };
    console.log('[supabaseService] create member — availPayload to insert:', availPayload);
    const { error: availError } = await supabase
      .from('member_availability')
      .insert(availPayload);
    if (availError) {
      // Rollback: delete orphaned member
      await supabase.from('members').delete().eq('id', (memberData as MemberRow).id);
      console.error('Supabase member_availability.create error:', availError);
      throw new Error(availError.message);
    }

    // 3. Re-fetch with joined availability
    const { data: full, error: fetchErr } = await supabase
      .from('members')
      .select('*, member_availability(*)')
      .eq('id', (memberData as MemberRow).id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    return toMember(full as MemberRow & { member_availability: MemberAvailabilityRow | MemberAvailabilityRow[] });
  },

  /**
   * Update member fields and/or availability
   */
  async update(id: string, updates: Partial<Member>): Promise<Member> {
    // Build member payload (only changed fields)
    const payload: Record<string, unknown> = {};
    if (updates.surname !== undefined) payload.surname = updates.surname;
    if (updates.firstName !== undefined) payload.first_name = updates.firstName;
    if (updates.middleInitial !== undefined) payload.middle_initial = updates.middleInitial;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.circuitId !== undefined) payload.circuit_id = updates.circuitId;
    if (updates.congregationId !== undefined) payload.congregation_id = updates.congregationId;
    if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth || null;
    if (updates.age !== undefined) payload.age = updates.age;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.appearance !== undefined) payload.appearance = updates.appearance;
    if (updates.language !== undefined) payload.language = updates.language;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.telegramHandle !== undefined) payload.telegram_handle = updates.telegramHandle;
    if (updates.ageGroup !== undefined) payload.age_group = updates.ageGroup;
    if (updates.experience !== undefined) payload.experience = updates.experience;
    if (updates.weeklyReservations !== undefined) payload.weekly_reservations = updates.weeklyReservations;
    if (updates.monthlyReservations !== undefined) payload.monthly_reservations = updates.monthlyReservations;
    if (updates.weeklyLimit !== undefined) payload.weekly_limit = updates.weeklyLimit;
    if (updates.monthlyLimit !== undefined) payload.monthly_limit = updates.monthlyLimit;
    if (updates.languageGroup !== undefined) payload.language_group = updates.languageGroup;
    if (updates.preferredDays !== undefined) payload.preferred_days = updates.preferredDays;
    if (updates.preferredTimes !== undefined) payload.preferred_times = updates.preferredTimes;
    if (updates.preferredLocations !== undefined) payload.preferred_locations = updates.preferredLocations;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('members').update(payload).eq('id', id);
      if (error) { console.error('Supabase members.update error:', error); throw new Error(error.message); }
    }

    // Update availability if provided — use atomic upsert on member_id UNIQUE constraint
    if (updates.availability) {
      const avail = updates.availability;
      console.log('[supabaseService] update — availability received:', avail);
      const { error: availError } = await supabase
        .from('member_availability')
        .upsert(
          {
            member_id: id,
            monday: avail.monday ?? 'NA',
            tuesday: avail.tuesday ?? 'NA',
            wednesday: avail.wednesday ?? 'NA',
            thursday: avail.thursday ?? 'NA',
            friday: avail.friday ?? 'NA',
            saturday_days: avail.saturdayDays ?? 0,
            sunday_days: avail.sundayDays ?? 0,
          },
          { onConflict: 'member_id' }
        );
      if (availError) {
        console.error('Supabase member_availability.upsert error:', availError);
        throw new Error(availError.message);
      }
    }

    // Re-fetch full member with availability
    const { data, error: fetchErr } = await supabase
      .from('members')
      .select('*, member_availability(*)')
      .eq('id', id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    return toMember(data as MemberRow & { member_availability: MemberAvailabilityRow | MemberAvailabilityRow[] });
  },

  /**
   * Delete a member (availability cascades via FK)
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ─── Timeslot Service ─────────────────────────────────────────

interface TimeslotRow {
  id: string;
  location_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  required_publishers: number;
  active: boolean;
}

function toTimeslot(row: TimeslotRow): Timeslot {
  return {
    id: row.id,
    locationId: row.location_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: row.start_time?.slice(0, 5) || '',  // "08:00:00" → "08:00"
    endTime: row.end_time?.slice(0, 5) || '',
    requiredPublishers: row.required_publishers,
    active: row.active,
  };
}

export const supabaseTimeslotService = {
  async getAll(): Promise<Timeslot[]> {
    const { data, error } = await supabase
      .from('timeslots')
      .select('*')
      .order('day_of_week')
      .order('start_time');
    if (error) { console.error('Supabase timeslots.getAll error:', error); throw new Error(error.message); }
    return (data as TimeslotRow[]).map(toTimeslot);
  },

  async create(timeslot: Omit<Timeslot, 'id'>): Promise<Timeslot> {
    const payload = {
      location_id: timeslot.locationId,
      day_of_week: timeslot.dayOfWeek,
      start_time: timeslot.startTime,
      end_time: timeslot.endTime,
      required_publishers: timeslot.requiredPublishers,
      active: timeslot.active ?? true,
    };
    const { data, error } = await supabase.from('timeslots').insert(payload).select().single();
    if (error) { console.error('Supabase timeslots.create error:', error); throw new Error(error.message); }
    return toTimeslot(data as TimeslotRow);
  },

  async update(id: string, updates: Partial<Timeslot>): Promise<Timeslot> {
    const payload: Record<string, unknown> = {};
    if (updates.locationId !== undefined) payload.location_id = updates.locationId;
    if (updates.dayOfWeek !== undefined) payload.day_of_week = updates.dayOfWeek;
    if (updates.startTime !== undefined) payload.start_time = updates.startTime;
    if (updates.endTime !== undefined) payload.end_time = updates.endTime;
    if (updates.requiredPublishers !== undefined) payload.required_publishers = updates.requiredPublishers;
    if (updates.active !== undefined) payload.active = updates.active;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('timeslots').update(payload).eq('id', id);
      if (error) { console.error('Supabase timeslots.update error:', error); throw new Error(error.message); }
    }

    const { data, error: fetchErr } = await supabase.from('timeslots').select('*').eq('id', id).single();
    if (fetchErr) throw new Error(fetchErr.message);
    return toTimeslot(data as TimeslotRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('timeslots').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
