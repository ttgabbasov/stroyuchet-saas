import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Shield, Lock, Smartphone, Fingerprint } from 'lucide-react-native';

export default function SecurityScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />
            <View className="flex-row items-center px-4 py-4 border-b border-white/5">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold ml-2">Безопасность</Text>
            </View>

            <ScrollView className="flex-1 px-4 pt-6">
                <View className="bg-card rounded-[32px] border border-secondary overflow-hidden mb-8">
                    <SecurityItem
                        icon={<Lock color="#94A3B8" size={20} />}
                        label="Изменить пароль"
                        onPress={() => alert('Смена пароля доступна в веб-версии')}
                    />
                    <SecurityItem
                        icon={<Smartphone color="#94A3B8" size={20} />}
                        label="Двухфакторная аутентификация"
                        value="Выкл"
                        onPress={() => alert('Настройка 2FA доступна в веб-версии')}
                    />
                    <SecurityItem
                        icon={<Fingerprint color="#94A3B8" size={20} />}
                        label="Вход по Biometrics / PIN"
                        value="В разработке"
                        isLast
                    />
                </View>

                <View className="bg-danger/10 rounded-[32px] p-6 border border-danger/20">
                    <Text className="text-danger font-bold mb-2">Активные сессии</Text>
                    <Text className="text-muted text-xs leading-4">
                        Вы вошли с этого устройства. Управление всеми активными сессиями доступно в настройках безопасности вашего аккаунта.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function SecurityItem({ icon, label, value, onPress, isLast }: any) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-row items-center justify-between p-5 ${!isLast ? 'border-b border-white/5' : ''}`}
        >
            <View className="flex-row items-center">
                <View className="mr-3">{icon}</View>
                <Text className="text-white font-medium">{label}</Text>
            </View>
            <Text className="text-muted text-xs">{value}</Text>
        </TouchableOpacity>
    );
}
