import * as SecureStore from 'expo-secure-store';

export const storage = {
    async set(key: string, value: string) {
        try {
            await SecureStore.setItemAsync(key, value);
        } catch (e) {
            console.error('SecureStore Set Error:', e);
        }
    },

    async get(key: string) {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (e) {
            console.error('SecureStore Get Error:', e);
            return null;
        }
    },

    async remove(key: string) {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (e) {
            console.error('SecureStore Remove Error:', e);
        }
    },
};
