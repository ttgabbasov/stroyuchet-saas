import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiGet } from '../lib/api';

export function AdminPanelButton() {
    const router = useRouter();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSuperAdmin();
    }, []);

    const checkSuperAdmin = async () => {
        try {
            await apiGet('/admin/me');
            setIsSuperAdmin(true);
        } catch {
            setIsSuperAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !isSuperAdmin) {
        return null;
    }

    return (
        <View className="mb-6">
            <TouchableOpacity
                onPress={() => router.push('/admin')}
                className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4 flex-row items-center justify-between"
                style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                }}
            >
                <View className="flex-row items-center gap-3">
                    <View className="bg-purple-500/20 p-2 rounded-full">
                        <Shield color="#A855F7" size={20} />
                    </View>
                    <View>
                        <Text className="text-white font-semibold">Панель администратора</Text>
                        <Text className="text-muted text-xs mt-0.5">
                            Управление пользователями и компаниями
                        </Text>
                    </View>
                </View>
                <View className="bg-purple-500/20 w-8 h-8 rounded-full items-center justify-center">
                    <Text className="text-purple-400 text-lg">›</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}
