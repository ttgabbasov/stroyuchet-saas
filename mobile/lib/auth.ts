import { create } from 'zustand';
import { storage } from './storage';

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: any | null;
    company: any | null;
    setAuth: (user: any, company: any, accessToken: string, refreshToken: string) => void;
    setAccessToken: (token: string | null) => void;
    setUser: (user: any | null) => void;
    setCompany: (company: any | null) => void;
    logout: () => void;
    init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    company: null,

    setAuth: (user, company, accessToken, refreshToken) => {
        storage.set('user', JSON.stringify(user));
        storage.set('company', JSON.stringify(company));
        storage.set('accessToken', accessToken);
        storage.set('refreshToken', refreshToken);
        set({ user, company, accessToken, refreshToken });
    },

    setAccessToken: (token) => {
        if (token) storage.set('accessToken', token);
        else storage.remove('accessToken');
        set({ accessToken: token });
    },

    setUser: (user) => {
        if (user) storage.set('user', JSON.stringify(user));
        else storage.remove('user');
        set({ user });
    },

    setCompany: (company) => {
        if (company) storage.set('company', JSON.stringify(company));
        else storage.remove('company');
        set({ company });
    },

    logout: () => {
        storage.remove('accessToken');
        storage.remove('refreshToken');
        storage.remove('user');
        storage.remove('company');
        set({ accessToken: null, refreshToken: null, user: null, company: null });
    },

    init: async () => {
        const token = await storage.get('accessToken');
        const refresh = await storage.get('refreshToken');
        const userStr = await storage.get('user');
        const companyStr = await storage.get('company');
        set({
            accessToken: token,
            refreshToken: refresh,
            user: userStr ? JSON.parse(userStr) : null,
            company: companyStr ? JSON.parse(companyStr) : null
        });
    },
}));
