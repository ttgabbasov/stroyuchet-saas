import { create } from 'zustand';
import { storage } from './storage';

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: any | null;
    setAuth: (user: any, accessToken: string, refreshToken: string) => void;
    setAccessToken: (token: string | null) => void;
    setUser: (user: any | null) => void;
    logout: () => void;
    init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    accessToken: null,
    refreshToken: null,
    user: null,

    setAuth: (user, accessToken, refreshToken) => {
        storage.set('user', JSON.stringify(user));
        storage.set('accessToken', accessToken);
        storage.set('refreshToken', refreshToken);
        set({ user, accessToken, refreshToken });
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

    logout: () => {
        storage.remove('accessToken');
        storage.remove('refreshToken');
        storage.remove('user');
        set({ accessToken: null, refreshToken: null, user: null });
    },

    init: async () => {
        const token = await storage.get('accessToken');
        const refresh = await storage.get('refreshToken');
        const userStr = await storage.get('user');
        set({
            accessToken: token,
            refreshToken: refresh,
            user: userStr ? JSON.parse(userStr) : null
        });
    },
}));
