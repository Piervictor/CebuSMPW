/**
 * API Service Layer
 * Handles all HTTP communication with the backend
 * Can switch between mock and real API by changing BASE_URL
 */

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
    getAll: () =>
      apiRequest<{
        id: string;
        locationId: string;
        date: string;
        startTime: string;
        endTime: string;
        requiredCount: number;
        assignedMembers: string[];
        status: 'open' | 'partial' | 'filled';
      }[]>('/shifts'),

    getById: (id: string) =>
      apiRequest<{
        id: string;
        locationId: string;
        date: string;
        startTime: string;
        endTime: string;
        requiredCount: number;
        assignedMembers: string[];
        status: 'open' | 'partial' | 'filled';
      }>(`/shifts/${id}`),

    update: (id: string, data: unknown) =>
      apiRequest(`/shifts/${id}`, { method: 'PUT', body: data }),

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
    getAll: () =>
      apiRequest<
        {
          id: string;
          name: string;
          congregationId: string;
        }[]
      >('/members'),

    getById: (id: string) =>
      apiRequest(`/members/${id}`),

    create: (data: unknown) =>
      apiRequest('/members', { method: 'POST', body: data }),

    update: (id: string, data: unknown) =>
      apiRequest(`/members/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) =>
      apiRequest(`/members/${id}`, { method: 'DELETE' }),

    getByCongregation: (congregationId: string) =>
      apiRequest(`/members?congregationId=${congregationId}`),
  },

  // ============ LOCATION ENDPOINTS ============
  locations: {
    getAll: () =>
      apiRequest<
        {
          id: string;
          name: string;
          category: string;
        }[]
      >('/locations'),

    getById: (id: string) =>
      apiRequest(`/locations/${id}`),

    create: (data: unknown) =>
      apiRequest('/locations', { method: 'POST', body: data }),

    update: (id: string, data: unknown) =>
      apiRequest(`/locations/${id}`, { method: 'PUT', body: data }),

    delete: (id: string) =>
      apiRequest(`/locations/${id}`, { method: 'DELETE' }),
  },

  // ============ CONGREGATION ENDPOINTS ============
  congregations: {
    getAll: () =>
      apiRequest<
        {
          id: string;
          name: string;
        }[]
      >('/congregations'),

    getById: (id: string) =>
      apiRequest(`/congregations/${id}`),

    create: (data: unknown) =>
      apiRequest('/congregations', { method: 'POST', body: data }),

    update: (id: string, data: unknown) =>
      apiRequest(`/congregations/${id}`, { method: 'PUT', body: data }),

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
