// Mock data for CartSmart Circuit

export type UserRole = 'circuit-admin' | 'congregation-admin' | 'member';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  congregationId?: string;
  telegramHandle?: string;
}

export interface Congregation {
  id: string;
  name: string;
  city: string;
  overseers: string[];
  publisherCount: number;
  shiftsServed: number;
  coverageRate: number;
}

export type LocationCategory = 'Hospital' | 'Plaza' | 'Terminal' | 'Mall';
export type AgeGroup = 'All ages' | 'Adults only' | 'Seniors excluded';
export type ExperienceLevel = 'Any' | 'Experienced only';

export interface Location {
  id: string;
  name: string;
  category: LocationCategory;
  city: string;
  linkedCongregations: string[];
  active: boolean;
  ageGroup: AgeGroup;
  experienceLevel: ExperienceLevel;
  maxPublishers: number;
  notes: string;
}

export interface Member {
  id: string;
  name: string;
  congregationId: string;
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

// Congregations
export const congregations: Congregation[] = [
  {
    id: 'cong-1',
    name: 'Central Congregation',
    city: 'Downtown',
    overseers: ['Brother Smith', 'Brother Johnson'],
    publisherCount: 85,
    shiftsServed: 234,
    coverageRate: 87,
  },
  {
    id: 'cong-2',
    name: 'Northside Congregation',
    city: 'North District',
    overseers: ['Brother Williams', 'Brother Brown'],
    publisherCount: 62,
    shiftsServed: 189,
    coverageRate: 92,
  },
  {
    id: 'cong-3',
    name: 'Riverside Congregation',
    city: 'Riverside',
    overseers: ['Brother Davis', 'Brother Miller'],
    publisherCount: 71,
    shiftsServed: 201,
    coverageRate: 78,
  },
  {
    id: 'cong-4',
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
    name: 'Sarah Thompson',
    congregationId: 'cong-1',
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
    name: 'Michael Chen',
    congregationId: 'cong-1',
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
    name: 'Emily Rodriguez',
    congregationId: 'cong-1',
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
    name: 'Robert Anderson',
    congregationId: 'cong-2',
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
    name: 'Jennifer Martinez',
    congregationId: 'cong-2',
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
    name: 'David Kim',
    congregationId: 'cong-3',
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
    name: 'Lisa Johnson',
    congregationId: 'cong-3',
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
    name: 'James Wilson',
    congregationId: 'cong-4',
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
    name: 'Patricia Lee',
    congregationId: 'cong-4',
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
    name: 'Daniel Brown',
    congregationId: 'cong-1',
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
    const dateStr = date.toISOString().split('T')[0];

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
export const getCongregationById = (id: string) => congregations.find((c) => c.id === id);
export const getLocationById = (id: string) => locations.find((l) => l.id === id);
export const getMemberById = (id: string) => members.find((m) => m.id === id);
export const getShiftById = (id: string) => shifts.find((s) => s.id === id);

export const getLocationName = (id: string) => getLocationById(id)?.name || 'Unknown';
export const getCongregationName = (id: string) => getCongregationById(id)?.name || 'Unknown';
export const getMemberName = (id: string) => getMemberById(id)?.name || 'Unknown';
