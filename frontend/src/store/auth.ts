import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Company } from '@/types';

// ============================================
// Auth Store
// ============================================

interface AuthState {
  user: User | null;
  company: Company | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, company: Company, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  setCompany: (company: Company) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, company, accessToken) =>
        set({
          user,
          company,
          accessToken,
          isAuthenticated: true,
        }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      setCompany: (company) =>
        set({ company }),

      setUser: (user) =>
        set({ user }),

      logout: () =>
        set({
          user: null,
          company: null,
          accessToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'stroyuchet-auth',
      partialize: (state) => ({
        // Не сохраняем accessToken в localStorage (безопаснее)
        user: state.user,
        company: state.company,
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

export const useUser = () => useAuthStore((state) => state.user);
export const useCompany = () => useAuthStore((state) => state.company);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsOwner = () => useAuthStore((state) => state.user?.role === 'OWNER');
export const useCanEdit = () => useAuthStore((state) =>
  state.user?.role === 'OWNER' || state.user?.role === 'FOREMAN'
);
