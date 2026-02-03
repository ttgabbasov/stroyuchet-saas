import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete, api } from './api';
import type {
  Transaction,
  CreateTransactionInput,
  Project,
  MoneySource,
  Category,
  CategoryGroup,
  CompanyUser,
  AnalyticsSummary,
  CashFlowReport,
  EquityReport,
} from '@/types';

// ============================================
// TRANSACTIONS
// ============================================

export function useTransactions(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => apiGet<Transaction[]>('/transactions', params),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => apiGet<Transaction>(`/transactions/${id}`),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionInput) =>
      apiPost<Transaction>('/transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['money-sources'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransactionInput> }) =>
      apiPatch<Transaction>(`/transactions/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['money-sources'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['money-sources'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ============================================
// PROJECTS
// ============================================

export function useProjects(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => apiGet<Project[]>('/projects', params),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => apiGet<Project>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiPatch<Project>(`/projects/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useInitiateDeleteProject() {
  return useMutation({
    mutationFn: (id: string) => apiPost(`/projects/${id}/delete/init`),
  });
}

export function useConfirmDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) =>
      apiDelete(`/projects/${id}/delete/confirm`, { data: { code } } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ============================================
// MONEY SOURCES
// ============================================

export function useMoneySources() {
  return useQuery({
    queryKey: ['money-sources'],
    queryFn: () => apiGet<MoneySource[]>('/money-sources'),
  });
}

export function useMoneySource(id: string) {
  return useQuery({
    queryKey: ['money-source', id],
    queryFn: () => apiGet<MoneySource>(`/money-sources/${id}`),
    enabled: !!id,
  });
}

export function useUpdateMoneySource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiPatch<MoneySource>(`/money-sources/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['money-sources'] });
      queryClient.invalidateQueries({ queryKey: ['money-source', id] });
    },
  });
}

export function useDeleteMoneySource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/money-sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['money-sources'] });
    },
  });
}

// ============================================
// CATEGORIES
// ============================================

interface CategoriesResponse {
  groups: CategoryGroup[];
  ungrouped: Category[];
}

export function useCategories(type?: string) {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: () => apiGet<CategoriesResponse>('/categories', type ? { type } : {}),
  });
}

// ============================================
// USERS
// ============================================

export function useCompanyUsers() {
  return useQuery({
    queryKey: ['company-users'],
    queryFn: () => apiGet<CompanyUser[]>('/users'),
  });
}

// ============================================
// UPLOADS
// ============================================

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadedFile> => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!data.success) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      return data.data;
    },
  });
}

// ============================================
// ANALYTICS
// ============================================

export function useAnalyticsSummary(filters: { projectId?: string; dateFrom?: string; dateTo?: string } = {}) {
  return useQuery({
    queryKey: ['analytics', 'summary', filters],
    queryFn: () => apiGet<AnalyticsSummary>('/transactions/analytics/summary', filters),
  });
}

export function useCashFlowReport(filters: { projectId?: string; dateFrom?: string; dateTo?: string } = {}) {
  return useQuery({
    queryKey: ['analytics', 'reports', 'cash-flow', filters],
    queryFn: () => apiGet<CashFlowReport>('/transactions/analytics/reports/cash-flow', filters),
  });
}

export function useHelpItems() {
  return useQuery({
    queryKey: ['help-items'],
    queryFn: () => apiGet<any[]>('/help'),
  });
}

export function useEquityReport() {
  return useQuery({
    queryKey: ['equity-report'],
    queryFn: () => apiGet<EquityReport>('/equity'),
  });
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}