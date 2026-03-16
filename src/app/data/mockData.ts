// Mock data for CartSmart Circuit

export type UserRole = 'circuit-admin' | 'congregation-admin' | 'member';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  congregationId?: string;
  telegramHandle?: string;
}

export interface Circuit {
  id: string;
  name: string;
  city?: string;
  coordinator: string;
  notes?: string;
}

export interface Congregation {
  id: string;
  circuitId: string;
  name: string;
  city?: string;
  overseers: string[];
  publisherCount?: number;
  shiftsServed: number;
  coverageRate: number;
}

export type LocationCategory = 'Hospital' | 'Plaza' | 'Terminal' | 'Mall';
export type AgeGroup = 'All ages' | 'Adults only' | 'Seniors excluded';
export type ExperienceLevel = 'Any' | 'Experienced only' | 'Intermediate';

export interface Location {
  id: string;
  circuitId: string;
  name: string;
  category: LocationCategory;
  city: string;
  linkedCongregations: string[];
  active: boolean;
  ageGroup?: AgeGroup;
  experienceLevel?: ExperienceLevel;
  maxPublishers?: number;
  multiCircuitSharing?: boolean;
  notes: string;
}

export type WeekdayAvailability = 'Morning' | 'Half Day Morning' | 'Half Day Afternoon' | 'Afternoon' | 'Full Day' | 'Evening' | 'NA';

export interface MemberAvailability {
  monday: WeekdayAvailability;
  tuesday: WeekdayAvailability;
  wednesday: WeekdayAvailability;
  thursday: WeekdayAvailability;
  friday: WeekdayAvailability;
  saturdayDays: number; // 0-4 (number of Saturdays available per month)
  sundayDays: number;   // 0-4 (number of Sundays available per month)
}

export type MemberStatus = 'Active' | 'Inactive';
export type MemberAppearance = 'Excellent' | 'Good' | 'Average';

export interface Member {
  id: string;
  surname: string;
  firstName: string;
  middleInitial?: string;
  name: string; // computed: "Surname, First Name M."
  circuitId: string;
  congregationId: string;
  dateOfBirth?: string; // ISO date string
  age?: number;
  status: MemberStatus;
  appearance: MemberAppearance;
  language?: string;
  availability: MemberAvailability;
  // Legacy / scheduling fields
  ageGroup: 'Youth' | 'Adult' | 'Senior';
  experience: 'New' | 'Intermediate' | 'Experienced';
  weeklyReservations: number;
  monthlyReservations: number;
  weeklyLimit: number;
  monthlyLimit: number;
  telegramHandle?: string;
  email?: string;
  phone?: string;
  languageGroup?: string;
  preferredDays: string[];
  preferredTimes: string[];
  preferredLocations: string[];
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Timeslot {
  id: string;
  locationId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  requiredPublishers: number;
  active: boolean;
}

export interface Shift {
  id: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredCount: number;
  assignedMembers: string[];
  assignedBy?: 'admin' | 'self';
  status: 'open' | 'partial' | 'filled';
}

// Current user
export let currentUser: User = {
  id: 'user-1',
  name: 'Admin User',
  role: 'circuit-admin',
  telegramHandle: '@adminuser',
};

export const setCurrentUser = (user: User) => {
  currentUser = user;
};

// Circuits
export const circuits: Circuit[] = [
  {
    id: 'circuit-1',
    name: 'Metro Cebu Central Circuit',
    city: 'Cebu City',
    coordinator: 'Brother Santos',
    notes: 'Handles high-density downtown and nearby urban witnessing assignments.',
  },
  {
    id: 'circuit-2',
    name: 'Metro Cebu North Circuit',
    city: 'Mandaue',
    coordinator: 'Brother Reyes',
    notes: 'Coordinates northern congregations and commercial-site witnessing support.',
  },
];

// Congregations
export const congregations: Congregation[] = [
  {
    id: 'cong-1',
    circuitId: 'circuit-1',
    name: 'Central Congregation',
    city: 'Downtown',
    overseers: ['Brother Smith', 'Brother Johnson'],
    publisherCount: 85,
    shiftsServed: 234,
    coverageRate: 87,
  },
  {
    id: 'cong-2',
    circuitId: 'circuit-2',
    name: 'Northside Congregation',
    city: 'North District',
    overseers: ['Brother Williams', 'Brother Brown'],
    publisherCount: 62,
    shiftsServed: 189,
    coverageRate: 92,
  },
  {
    id: 'cong-3',
    circuitId: 'circuit-1',
    name: 'Riverside Congregation',
    city: 'Riverside',
    overseers: ['Brother Davis', 'Brother Miller'],
    publisherCount: 71,
    shiftsServed: 201,
    coverageRate: 78,
  },
  {
    id: 'cong-4',
    circuitId: 'circuit-2',
    name: 'Westend Congregation',
    city: 'West End',
    overseers: ['Brother Wilson', 'Brother Moore'],
    publisherCount: 54,
    shiftsServed: 156,
    coverageRate: 85,
  },
];

// Locations
export const locations: Location[] = [
  {
    id: 'loc-1',
    circuitId: 'circuit-1',
    name: 'City General Hospital',
    category: 'Hospital',
    city: 'Downtown',
    linkedCongregations: ['cong-1', 'cong-2'],
    active: true,
    ageGroup: 'Seniors excluded',
    experienceLevel: 'Experienced only',
    maxPublishers: 2,
    notes: 'Quiet demeanor required. Hospital staff are supportive.',
  },
  {
    id: 'loc-2',
    circuitId: 'circuit-1',
    name: 'Central Plaza',
    category: 'Plaza',
    city: 'Downtown',
    linkedCongregations: ['cong-1', 'cong-2', 'cong-3'],
    active: true,
    ageGroup: 'All ages',
    experienceLevel: 'Any',
    maxPublishers: 4,
    notes: 'High foot traffic on weekends. Bring umbrella stand.',
  },
  {
    id: 'loc-3',
    circuitId: 'circuit-1',
    name: 'Union Station Terminal',
    category: 'Terminal',
    city: 'Downtown',
    linkedCongregations: ['cong-1', 'cong-3'],
    active: true,
    ageGroup: 'Adults only',
    experienceLevel: 'Intermediate',
    maxPublishers: 3,
    notes: 'Permit required. Check in with security.',
  },
  {
    id: 'loc-4',
    circuitId: 'circuit-2',
    name: 'Riverside Mall',
    category: 'Mall',
    city: 'Riverside',
    linkedCongregations: ['cong-3', 'cong-4'],
    active: true,
    ageGroup: 'All ages',
    experienceLevel: 'Any',
    maxPublishers: 3,
    notes: 'Setup near main entrance. Mall management prefers morning slots.',
  },
  {
    id: 'loc-5',
    circuitId: 'circuit-2',
    name: 'Northside Shopping Center',
    category: 'Mall',
    city: 'North District',
    linkedCongregations: ['cong-2', 'cong-4'],
    active: true,
    ageGroup: 'All ages',
    experienceLevel: 'Any',
    maxPublishers: 2,
    notes: 'Good response from shoppers.',
  },
  {
    id: 'loc-6',
    circuitId: 'circuit-2',
    name: 'Westend Plaza',
    category: 'Plaza',
    city: 'West End',
    linkedCongregations: ['cong-4'],
    active: false,
    ageGroup: 'All ages',
    experienceLevel: 'Any',
    maxPublishers: 2,
    notes: 'Temporarily inactive due to construction.',
  },
];

// Members
export const members: Member[] = [
  {
    id: 'mem-1',
    surname: 'Thompson',
    firstName: 'Sarah',
    middleInitial: 'A',
    name: 'Thompson, Sarah A.',
    circuitId: 'circuit-1',
    congregationId: 'cong-1',
    dateOfBirth: '1990-05-15',
    age: 35,
    status: 'Active',
    appearance: 'Excellent',
    language: 'English',
    availability: { monday: 'Morning', tuesday: 'NA', wednesday: 'Full Day', thursday: 'NA', friday: 'Morning', saturdayDays: 2, sundayDays: 0 },
    ageGroup: 'Adult',
    experience: 'Experienced',
    weeklyReservations: 2,
    monthlyReservations: 8,
    weeklyLimit: 3,
    monthlyLimit: 12,
    telegramHandle: '@sthompson',
    email: 'sarah.t@example.com',
    phone: '555-0101',
    languageGroup: 'English',
    preferredDays: ['Monday', 'Wednesday', 'Friday'],
    preferredTimes: ['Morning'],
    preferredLocations: ['loc-1', 'loc-2'],
  },
  {
    id: 'mem-2',
    surname: 'Chen',
    firstName: 'Michael',
    middleInitial: 'L',
    name: 'Chen, Michael L.',
    circuitId: 'circuit-1',
    congregationId: 'cong-1',
    dateOfBirth: '1988-11-22',
    age: 37,
    status: 'Active',
    appearance: 'Good',
    language: 'English, Mandarin',
    availability: { monday: 'NA', tuesday: 'Afternoon', wednesday: 'NA', thursday: 'Afternoon', friday: 'NA', saturdayDays: 4, sundayDays: 4 },
    ageGroup: 'Adult',
    experience: 'Experienced',
    weeklyReservations: 1,
    monthlyReservations: 5,
    weeklyLimit: 2,
    monthlyLimit: 10,
    telegramHandle: '@mchen',
    email: 'michael.c@example.com',
    languageGroup: 'English, Mandarin',
    preferredDays: ['Saturday', 'Sunday'],
    preferredTimes: ['Morning', 'Afternoon'],
    preferredLocations: ['loc-2', 'loc-3'],
  },
  {
    id: 'mem-3',
    surname: 'Rodriguez',
    firstName: 'Emily',
    name: 'Rodriguez, Emily',
    circuitId: 'circuit-1',
    congregationId: 'cong-1',
    dateOfBirth: '2003-02-10',
    age: 23,
    status: 'Active',
    appearance: 'Average',
    language: 'English',
    availability: { monday: 'NA', tuesday: 'NA', wednesday: 'NA', thursday: 'NA', friday: 'NA', saturdayDays: 3, sundayDays: 0 },
    ageGroup: 'Youth',
    experience: 'New',
    weeklyReservations: 1,
    monthlyReservations: 3,
    weeklyLimit: 2,
    monthlyLimit: 8,
    email: 'emily.r@example.com',
    preferredDays: ['Saturday'],
    preferredTimes: ['Afternoon'],
    preferredLocations: ['loc-2'],
  },
  {
    id: 'mem-4',
    surname: 'Anderson',
    firstName: 'Robert',
    middleInitial: 'J',
    name: 'Anderson, Robert J.',
    circuitId: 'circuit-1',
    congregationId: 'cong-2',
    dateOfBirth: '1960-08-03',
    age: 65,
    status: 'Active',
    appearance: 'Good',
    language: 'English',
    availability: { monday: 'NA', tuesday: 'Morning', wednesday: 'NA', thursday: 'Morning', friday: 'NA', saturdayDays: 0, sundayDays: 0 },
    ageGroup: 'Senior',
    experience: 'Experienced',
    weeklyReservations: 2,
    monthlyReservations: 9,
    weeklyLimit: 3,
    monthlyLimit: 12,
    telegramHandle: '@randerson',
    phone: '555-0202',
    languageGroup: 'English',
    preferredDays: ['Tuesday', 'Thursday'],
    preferredTimes: ['Morning'],
    preferredLocations: ['loc-2', 'loc-5'],
  },
  {
    id: 'mem-5',
    surname: 'Martinez',
    firstName: 'Jennifer',
    name: 'Martinez, Jennifer',
    circuitId: 'circuit-1',
    congregationId: 'cong-2',
    dateOfBirth: '1985-07-20',
    age: 40,
    status: 'Active',
    appearance: 'Good',
    language: 'English, Spanish',
    availability: { monday: 'Afternoon', tuesday: 'NA', wednesday: 'Afternoon', thursday: 'NA', friday: 'Afternoon', saturdayDays: 0, sundayDays: 0 },
    ageGroup: 'Adult',
    experience: 'Intermediate',
    weeklyReservations: 1,
    monthlyReservations: 6,
    weeklyLimit: 2,
    monthlyLimit: 10,
    telegramHandle: '@jmartinez',
    email: 'jennifer.m@example.com',
    languageGroup: 'English, Spanish',
    preferredDays: ['Monday', 'Wednesday', 'Friday'],
    preferredTimes: ['Afternoon'],
    preferredLocations: ['loc-2', 'loc-5'],
  },
  {
    id: 'mem-6',
    surname: 'Kim',
    firstName: 'David',
    name: 'Kim, David',
    circuitId: 'circuit-2',
    congregationId: 'cong-3',
    dateOfBirth: '1992-03-12',
    age: 33,
    status: 'Active',
    appearance: 'Excellent',
    language: 'English, Korean',
    availability: { monday: 'Full Day', tuesday: 'Full Day', wednesday: 'Full Day', thursday: 'Full Day', friday: 'Full Day', saturdayDays: 4, sundayDays: 2 },
    ageGroup: 'Adult',
    experience: 'Experienced',
    weeklyReservations: 3,
    monthlyReservations: 11,
    weeklyLimit: 3,
    monthlyLimit: 12,
    telegramHandle: '@dkim',
    email: 'david.k@example.com',
    languageGroup: 'English, Korean',
    preferredDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    preferredTimes: ['Morning', 'Afternoon'],
    preferredLocations: ['loc-2', 'loc-3', 'loc-4'],
  },
  {
    id: 'mem-7',
    surname: 'Johnson',
    firstName: 'Lisa',
    name: 'Johnson, Lisa',
    circuitId: 'circuit-2',
    congregationId: 'cong-3',
    dateOfBirth: '1995-09-30',
    age: 30,
    status: 'Active',
    appearance: 'Average',
    language: 'English',
    availability: { monday: 'NA', tuesday: 'NA', wednesday: 'NA', thursday: 'NA', friday: 'NA', saturdayDays: 4, sundayDays: 4 },
    ageGroup: 'Adult',
    experience: 'Intermediate',
    weeklyReservations: 1,
    monthlyReservations: 4,
    weeklyLimit: 2,
    monthlyLimit: 10,
    email: 'lisa.j@example.com',
    preferredDays: ['Saturday', 'Sunday'],
    preferredTimes: ['Morning'],
    preferredLocations: ['loc-4'],
  },
  {
    id: 'mem-8',
    surname: 'Wilson',
    firstName: 'James',
    name: 'Wilson, James',
    circuitId: 'circuit-2',
    congregationId: 'cong-4',
    dateOfBirth: '1998-01-05',
    age: 28,
    status: 'Active',
    appearance: 'Average',
    language: 'English',
    availability: { monday: 'NA', tuesday: 'NA', wednesday: 'NA', thursday: 'NA', friday: 'NA', saturdayDays: 2, sundayDays: 0 },
    ageGroup: 'Adult',
    experience: 'New',
    weeklyReservations: 0,
    monthlyReservations: 2,
    weeklyLimit: 2,
    monthlyLimit: 8,
    preferredDays: ['Saturday'],
    preferredTimes: ['Afternoon'],
    preferredLocations: ['loc-4', 'loc-5'],
  },
  {
    id: 'mem-9',
    surname: 'Lee',
    firstName: 'Patricia',
    name: 'Lee, Patricia',
    circuitId: 'circuit-2',
    congregationId: 'cong-4',
    dateOfBirth: '1958-12-18',
    age: 67,
    status: 'Active',
    appearance: 'Good',
    language: 'English',
    availability: { monday: 'NA', tuesday: 'Morning', wednesday: 'NA', thursday: 'Morning', friday: 'NA', saturdayDays: 3, sundayDays: 0 },
    ageGroup: 'Senior',
    experience: 'Experienced',
    weeklyReservations: 2,
    monthlyReservations: 7,
    weeklyLimit: 3,
    monthlyLimit: 12,
    telegramHandle: '@plee',
    phone: '555-0404',
    languageGroup: 'English',
    preferredDays: ['Tuesday', 'Thursday', 'Saturday'],
    preferredTimes: ['Morning'],
    preferredLocations: ['loc-4', 'loc-5'],
  },
  {
    id: 'mem-10',
    surname: 'Brown',
    firstName: 'Daniel',
    middleInitial: 'R',
    name: 'Brown, Daniel R.',
    circuitId: 'circuit-1',
    congregationId: 'cong-1',
    dateOfBirth: '1987-04-25',
    age: 38,
    status: 'Inactive',
    appearance: 'Good',
    language: 'English',
    availability: { monday: 'Afternoon', tuesday: 'NA', wednesday: 'NA', thursday: 'NA', friday: 'Afternoon', saturdayDays: 0, sundayDays: 0 },
    ageGroup: 'Adult',
    experience: 'Intermediate',
    weeklyReservations: 2,
    monthlyReservations: 7,
    weeklyLimit: 3,
    monthlyLimit: 12,
    telegramHandle: '@dbrown',
    email: 'daniel.b@example.com',
    preferredDays: ['Monday', 'Friday'],
    preferredTimes: ['Afternoon'],
    preferredLocations: ['loc-1', 'loc-2'],
  },
];

// Shifts - Generate shifts for the next 14 days
const generateShifts = (): Shift[] => {
  const shifts: Shift[] = [];
  const today = new Date();
  const timeSlots = [
    { start: '09:00', end: '11:00' },
    { start: '11:00', end: '13:00' },
    { start: '14:00', end: '16:00' },
    { start: '16:00', end: '18:00' },
  ];

  for (let day = 0; day < 14; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${d}`;

    // Generate shifts for each active location
    locations
      .filter((loc) => loc.active)
      .forEach((loc) => {
        // Not all locations have shifts every day
        const shiftsPerDay = loc.category === 'Hospital' ? 2 : 3;
        
        for (let i = 0; i < shiftsPerDay; i++) {
          const slot = timeSlots[i % timeSlots.length];
          const requiredCount = Math.floor(Math.random() * loc.maxPublishers) + 1;
          
          // Randomly assign some members
          const assignedCount = Math.random() > 0.3 ? Math.floor(Math.random() * (requiredCount + 1)) : 0;
          const eligibleMembers = members.filter(m => 
            loc.linkedCongregations.includes(m.congregationId)
          );
          
          const assignedMembers: string[] = [];
          for (let j = 0; j < assignedCount && j < eligibleMembers.length; j++) {
            const randomMember = eligibleMembers[Math.floor(Math.random() * eligibleMembers.length)];
            if (!assignedMembers.includes(randomMember.id)) {
              assignedMembers.push(randomMember.id);
            }
          }

          const status: 'open' | 'partial' | 'filled' = 
            assignedMembers.length === 0 ? 'open' :
            assignedMembers.length < requiredCount ? 'partial' : 'filled';

          shifts.push({
            id: `shift-${day}-${loc.id}-${i}`,
            locationId: loc.id,
            date: dateStr,
            startTime: slot.start,
            endTime: slot.end,
            requiredCount,
            assignedMembers,
            assignedBy: assignedMembers.length > 0 ? (Math.random() > 0.5 ? 'admin' : 'self') : undefined,
            status,
          });
        }
      });
  }

  return shifts;
};

export const shifts = generateShifts();

// Helper functions
export const getCircuitById = (id: string) => circuits.find((c) => c.id === id);
export const getCongregationById = (id: string) => congregations.find((c) => c.id === id);
export const getLocationById = (id: string) => locations.find((l) => l.id === id);
export const getMemberById = (id: string) => members.find((m) => m.id === id);
export const getShiftById = (id: string) => shifts.find((s) => s.id === id);

export const getCircuitName = (id: string) => getCircuitById(id)?.name || 'Unknown';
export const getLocationName = (id: string) => getLocationById(id)?.name || 'Unknown';
export const getCongregationName = (id: string) => getCongregationById(id)?.name || 'Unknown';
export const getMemberName = (id: string) => getMemberById(id)?.name || 'Unknown';
