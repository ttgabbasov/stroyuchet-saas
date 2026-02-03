import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Building2, Globe, MapPin, Hash } from 'lucide-react-native';
import { useAuthStore } from '../lib/auth';

export default function CompanyScreen() {
    const user = useAuthStore((state) => state.user);
    const company = useAuthStore((state) => state.company);
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="flex-row items-center px-4 py-4 border-b border-white/5">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold ml-2">Компания</Text>
            </View>

            <ScrollView className="flex-1 px-4 pt-6">
                <View className="items-center mb-8">
                    <View className="w-24 h-24 rounded-[32px] bg-primary/10 items-center justify-center border border-primary/20 mb-4 overflow-hidden">
                        {/* Placeholder for Logo */}
                        <Building2 color="#2563EB" size={48} />
                    </View>
                    <Text className="text-white text-2xl font-bold text-center">{company?.name || 'Моя Компания'}</Text>
                    <View className="bg-success/10 px-3 py-1 rounded-full mt-2 border border-success/20">
                        <Text className="text-success text-[10px] font-bold uppercase tracking-widest">Активный аккаунт</Text>
                    </View>
                </View>

                <View className="bg-card rounded-[32px] border border-secondary overflow-hidden mb-8">
                    <InfoRow icon={<Building2 color="#94A3B8" size={20} />} label="Название" value={company?.name} />
                    <InfoRow icon={<Hash color="#94A3B8" size={20} />} label="ИНН / Реквизиты" value={company?.taxId || 'Не указаны'} />
                    <InfoRow icon={<MapPin color="#94A3B8" size={20} />} label="Юридический адрес" value={company?.address || 'Не указан'} isLast />
                </View>

                <TouchableOpacity
                    className="bg-primary border border-primary/30 rounded-2xl p-5 items-center shadow-lg shadow-primary/30"
                    onPress={() => alert('Редактирование компании будет доступно в следующем обновлении')}
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
