import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    User,
    Building2,
    Users,
    CreditCard,
    Bell,
    Shield,
    HelpCircle,
    LogOut,
    ChevronRight,
    UserPlus,
    Send
} from 'lucide-react-native';
import { useAuthStore } from '../../lib/auth';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';

export default function SettingsScreen() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
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

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-white text-3xl font-bold">Настройки</Text>
                </View>

                {/* Profile Card */}
                <View className="bg-card border border-secondary rounded-3xl p-6 mb-8 flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.push('/profile')}
                        className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center border border-primary/30 mr-4 overflow-hidden"
                    >
                        {/* Placeholder for Photo */}
                        <User color="#2563EB" size={32} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-white text-xl font-bold font-heading">{user?.name || 'Пользователь'}</Text>
                        <Text className="text-muted text-sm">{user?.email}</Text>
                        <View className="bg-primary/10 self-start px-3 py-1 rounded-full mt-2 border border-primary/20">
                            <Text className="text-primary text-[10px] font-bold uppercase tracking-widest">{getRoleLabel(user?.role)}</Text>
                        </View>
                    </View>
                </View>

                {/* Menu Sections */}
                <MenuSection title="Аккаунт">
                    <MenuItem
                        icon={<User color="#94A3B8" size={20} />}
                        label="Профиль"
                        onPress={() => router.push('/profile')}
                    />
                    <MenuItem
                        icon={<Building2 color="#94A3B8" size={20} />}
                        label="Компания"
                        onPress={() => router.push('/company')}
                    />
                </MenuSection>

                <MenuSection title="Команда">
                    <MenuItem
                        icon={<Users color="#94A3B8" size={20} />}
                        label="Пользователи"
                        onPress={() => router.push('/users')}
                    />
                    <MenuItem
                        icon={<UserPlus color="#2563EB" size={20} />}
                        label="Пригласить партнера"
                        labelColor="text-primary"
                        onPress={() => router.push('/users')}
                    />
                </MenuSection>

                <MenuSection title="Система">
                    <MenuItem
                        icon={<CreditCard color="#94A3B8" size={20} />}
                        label="Подписка"
                        onPress={() => router.push('/subscription')}
                    />
                    <MenuItem
                        icon={<Bell color="#94A3B8" size={20} />}
                        label="Уведомления"
                        onPress={() => router.push('/notifications')}
                    />
                    <MenuItem
                        icon={<Shield color="#94A3B8" size={20} />}
                        label="Безопасность"
                        onPress={() => router.push('/security')}
                    />
                </MenuSection>

                <MenuSection title="Поддержка">
                    <MenuItem
                        icon={<Send color="#0088cc" size={20} />}
                        label="Telegram Бот"
                        value={user?.telegramId ? "Привязан" : "Не привязан"}
                        onPress={() => {
                            if (!user?.telegramId) {
                                alert('Для работы бота его нужно привязать в настройках вашего аккаунта на сайте tgabbasov.store');
                            }
                            Linking.openURL('https://t.me/STUchetBot');
                        }}
                    />
                    <MenuItem
                        icon={<HelpCircle color="#94A3B8" size={20} />}
                        label="Помощь"
                        onPress={() => router.push('/help')}
                    />
                </MenuSection>

                {/* Logout */}
                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center border border-danger/20 rounded-3xl p-5 mb-12"
                >
                    <View className="w-10 h-10 rounded-2xl bg-danger/10 items-center justify-center mr-4">
                        <LogOut color="#EF4444" size={20} />
                    </View>
                    <Text className="text-danger font-bold text-lg">Выйти</Text>
                </TouchableOpacity>

                <Text className="text-center text-muted text-xs mb-8 opacity-50 uppercase tracking-widest">
                    СтройУчёт v1.0.0
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

function MenuSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <View className="mb-8">
            <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-3 ml-2">{title}</Text>
            <View className="bg-white/10 border border-white/20 rounded-3xl overflow-hidden">
                {children}
            </View>
        </View>
    );
}

function MenuItem({ icon, label, value, labelColor = "text-white", onPress }: any) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center justify-between p-4 border-b border-white/5 active:bg-white/10"
        >
            <View className="flex-row items-center">
                <View className="mr-3">{icon}</View>
                <Text className={`${labelColor} font-medium`}>{label}</Text>
            </View>
            <View className="flex-row items-center">
                {value && <Text className="text-muted text-sm mr-2">{value}</Text>}
                <ChevronRight color="#475569" size={18} />
            </View>
        </TouchableOpacity>
    );
}
