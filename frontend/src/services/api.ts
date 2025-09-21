import axios from 'axios';
import {
  JobRole,
  DashboardStats,
  CandidateFilters,
  BulkUploadResponse,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (username: string, email: string, password: string, role?: string) => {
    const response = await api.post('/auth/register', { username, email, password, role });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Job Roles API
export const jobRolesAPI = {
  getAll: async (active?: boolean) => {
    const params = active !== undefined ? { active: active.toString() } : {};
    const response = await api.get('/job-roles', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/job-roles/${id}`);
    return response.data;
  },

  create: async (jobRole: Omit<JobRole, '_id' | 'createdAt' | 'updatedAt'>) => {
    const response = await api.post('/job-roles', jobRole);
    return response.data;
  },

  update: async (id: string, jobRole: Partial<JobRole>) => {
    const response = await api.put(`/job-roles/${id}`, jobRole);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/job-roles/${id}`);
    return response.data;
  },

  initializeDefaults: async () => {
    const response = await api.post('/job-roles/initialize-defaults');
    return response.data;
  },
};

// Candidates API
export const candidatesAPI = {
  getAll: async (filters: CandidateFilters = {}) => {
    const response = await api.get('/candidates', { params: filters });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/candidates/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/candidates/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/candidates/${id}`);
    return response.data;
  },

  downloadResume: async (id: string) => {
    const response = await api.get(`/candidates/${id}/resume`, {
      responseType: 'blob',
    });
    return response;
  },

  getGroupedByJobRole: async (limit?: number) => {
    const params = limit ? { limit: limit.toString() } : {};
    const response = await api.get('/candidates/grouped/by-job-role', { params });
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/candidates/stats/dashboard');
    return response.data as DashboardStats;
  },
};

// Upload API
export const uploadAPI = {
  uploadResume: async (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await api.post('/upload/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  bulkUploadResumes: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('resumes', file);
    });

    const response = await api.post('/upload/bulk-resumes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as BulkUploadResponse;
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
