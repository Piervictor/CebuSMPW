/**
 * API Service Layer
 * Handles all HTTP communication with the backend
 * Can switch between mock and real API by changing BASE_URL
 */

import type { Congregation, Location, Member, Shift } from '../app/data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Generic API request handler
 * Automatically adds auth token and handles responses
 */
async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body } = config;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0
    );
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API service singleton
 * Provides methods for all API endpoints
 */
export const apiService = {
  // ============ SHIFT ENDPOINTS ============
  shifts: {
    getAll: () => apiRequest<Shift[]>('/shifts'),

    getById: (id: string) => apiRequest<Shift>(`/shifts/${id}`),

    update: (id: string, data: unknown) =>
      apiRequest<Shift>(`/shifts/${id}`, { method: 'PUT', body: data }),

    assignMember: (shiftId: string, memberId: string) =>
      apiRequest(`/shifts/${shiftId}/assign`, {
        method: 'POST',
        body: { memberId },
      }),

    removeMember: (shiftId: string, memberId: string) =>
      apiRequest(`/shifts/${shiftId}/remove`, {
        method: 'POST',
        body: { memberId },
      }),
  },

  // ============ MEMBER ENDPOINTS ============
  members: {
    getAll: () => apiRequest<Member[]>('/members'),

    getById: (id: string) => apiRequest<Member>(`/members/${id}`),

    create: (data: unknown) =>
      apiRequest<Member>('/members', { method: 'POST', body: data }),

    update: (id: string, data: unknown) =>
      apiRequest<Member>(`/members/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) =>
      apiRequest(`/members/${id}`, { method: 'DELETE' }),

    getByCongregation: (congregationId: string) =>
      apiRequest<Member[]>(`/members?congregationId=${congregationId}`),
  },

  // ============ LOCATION ENDPOINTS ============
  locations: {
    getAll: () => apiRequest<Location[]>('/locations'),

    getById: (id: string) => apiRequest<Location>(`/locations/${id}`),

    create: (data: unknown) =>
      apiRequest<Location>('/locations', { method: 'POST', body: data }),

    update: (id: string, data: unknown) =>
      apiRequest<Location>(`/locations/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) =>
      apiRequest(`/locations/${id}`, { method: 'DELETE' }),
  },

  // ============ CONGREGATION ENDPOINTS ============
  congregations: {
    getAll: () => apiRequest<Congregation[]>('/congregations'),

    getById: (id: string) => apiRequest<Congregation>(`/congregations/${id}`),

    create: (data: unknown) =>
      apiRequest<Congregation>('/congregations', { method: 'POST', body: data }),

    update: (id: string, data: unknown) =>
      apiRequest<Congregation>(`/congregations/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) =>
      apiRequest(`/congregations/${id}`, { method: 'DELETE' }),
  },

  // ============ AUTH ENDPOINTS ============
  auth: {
    login: (credentials: unknown) =>
      apiRequest<{ token: string; user: unknown }>('/auth/login', {
        method: 'POST',
        body: credentials,
      }),

    logout: () =>
      apiRequest('/auth/logout', { method: 'POST' }),

    refreshToken: () =>
      apiRequest<{ token: string }>('/auth/refresh', { method: 'POST' }),
  },
};

export default apiService;
