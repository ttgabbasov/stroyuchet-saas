import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

// ============================================
// API Client Configuration
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// Request Interceptor (add auth token)
// ============================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// Response Interceptor (handle 401, refresh token)
// ============================================

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthRoute = originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh');

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (data.success && data.data.accessToken) {
          useAuthStore.getState().setAccessToken(data.data.accessToken);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          }

          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// ============================================
// Helper Functions
// ============================================

// Helper to extract error message
function handleApiError(error: any): never {
  if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
    throw new Error(error.response.data.error.message);
  }
  throw error;
}

export async function apiGet<T>(url: string, params?: Record<string, any>): Promise<T> {
  try {
    const { data } = await api.get<ApiResponse<T>>(url, { params });
    if (!data.success) {
      throw new Error(data.error?.message || 'Request failed');
    }
    return data.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function apiPost<T>(url: string, body?: any): Promise<T> {
  try {
    const { data } = await api.post<ApiResponse<T>>(url, body);
    if (!data.success) {
      throw new Error(data.error?.message || 'Request failed');
    }
    return data.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function apiPatch<T>(url: string, body?: any): Promise<T> {
  try {
    const { data } = await api.patch<ApiResponse<T>>(url, body);
    if (!data.success) {
      throw new Error(data.error?.message || 'Request failed');
    }
    return data.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  try {
    const { data } = await api.delete<ApiResponse<T>>(url);
    if (!data.success) {
      throw new Error(data.error?.message || 'Request failed');
    }
    return data.data;
  } catch (error) {
    handleApiError(error);
  }
}

export default api;
