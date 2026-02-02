import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';
import { useAuthStore } from './auth';

// UPDATE THIS TO YOUR SERVER IP
const API_URL = 'http://31.129.97.194/api';

export const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Try to get token from store first (it's faster), then storage
        let token = useAuthStore.getState().accessToken;
        if (!token) {
            token = await storage.get('accessToken');
        }

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 Unauthorized and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await storage.get('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');

                // Try to refresh token
                const { data } = await axios.post(`${API_URL}/auth/refresh`, {
                    refreshToken
                });

                if (data.success && data.data.accessToken) {
                    const newAccessToken = data.data.accessToken;
                    const newRefreshToken = data.data.refreshToken;

                    // Update store (which also updates storage)
                    useAuthStore.getState().setAccessToken(newAccessToken);
                    if (newRefreshToken) {
                        // We need a setRefreshToken or just update storage
                        storage.set('refreshToken', newRefreshToken);
                    }

                    // Retry original request
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    }
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, logout
                useAuthStore.getState().logout();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: {
        code: string;
        message: string;
    };
}

export async function apiGet<T>(url: string, params?: Record<string, any>): Promise<T> {
    const { data } = await api.get<ApiResponse<T>>(url, { params });
    if (!data.success) throw new Error(data.error?.message || 'Request failed');
    return data.data;
}

export async function apiPost<T>(url: string, body?: any): Promise<T> {
    const { data } = await api.post<ApiResponse<T>>(url, body);
    if (!data.success) throw new Error(data.error?.message || 'Request failed');
    return data.data;
}

export default api;
