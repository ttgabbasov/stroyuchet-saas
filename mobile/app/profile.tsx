import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, User, Mail, Shield, Smartphone } from 'lucide-react-native';
import { useAuthStore } from '../lib/auth';

export default function ProfileScreen() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();

    const getRoleLabel = (role?: string) => {
        const roles: Record<string, string> = {
            'OWNER': 'Владелец',
            'ADMIN': 'Администратор',
            'MANAGER': 'Менеджер',
            'ACCOUNTANT': 'Бухгалтер',
            'FOREMAN': 'Прораб'
        };
        return roles[role || ''] || role || 'Пользователь';
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="flex-row items-center px-4 py-4 border-b border-white/5">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold ml-2">Профиль</Text>
            </View>

            <ScrollView className="flex-1 px-4 pt-6">
                <View className="items-center mb-8">
                    <View className="w-24 h-24 rounded-full bg-primary/20 items-center justify-center border-2 border-primary/30 mb-4">
                        <User color="#2563EB" size={48} />
                    </View>
                    <Text className="text-white text-2xl font-bold">{user?.name || 'Пользователь'}</Text>
                    <View className="bg-primary/10 px-3 py-1 rounded-full mt-1 border border-primary/20">
                        <Text className="text-primary text-[10px] font-bold uppercase tracking-widest">{getRoleLabel(user?.role)}</Text>
                    </View>
                    <Text className="text-muted mt-2">{user?.email}</Text>
                </View>

                <View className="bg-card rounded-3xl border border-secondary overflow-hidden mb-8">
                    <InfoRow icon={<User color="#94A3B8" size={20} />} label="Имя" value={user?.name} />
                    <InfoRow icon={<Mail color="#94A3B8" size={20} />} label="Email" value={user?.email} />
                    <InfoRow icon={<Shield color="#94A3B8" size={20} />} label="Роль" value={getRoleLabel(user?.role)} isLast />
                </View>

                <TouchableOpacity
                    className="bg-primary border border-primary/30 rounded-2xl p-5 items-center shadow-lg shadow-primary/30"
                    onPress={() => alert('Редактирование профиля будет доступно в следующем обновлении')}
                >
                    <Text className="text-white font-bold text-lg">Редактировать</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function InfoRow({ icon, label, value, isLast }: any) {
    return (
        <View className={`flex-row items-center p-4 ${!isLast ? 'border-b border-white/5' : ''}`}>
            <View className="mr-3">{icon}</View>
            <View className="flex-1">
                <Text className="text-muted text-xs uppercase font-bold tracking-wider">{label}</Text>
                <Text className="text-white text-base mt-0.5">{value || 'не указано'}</Text>
            </View>
        </View>
    );
}
