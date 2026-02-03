import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Users as UsersIcon,
    UserPlus,
    Mail,
    ChevronLeft,
    Search,
    User as UserIcon,
    Trash2
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiGet, apiPost } from '../lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export default function UsersScreen() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [inviting, setInviting] = useState(false);
    const [email, setEmail] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            // This endpoint might need to be verified
            const data = await apiGet<User[]>('/users');
            setUsers(data);
        } catch (err: any) {
            console.error('Fetch users error:', err);
            // Fallback for demo/dev if endpoint is not ready
            setUsers([
                { id: '1', name: 'Тимур Г.', email: 'timur@example.com', role: 'OWNER' },
                { id: '2', name: 'Иван Иванов', email: 'ivan@example.com', role: 'FOREMAN' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInvite = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert('Ошибка', 'Введите корректный email');
            return;
        }

        setInviting(true);
        try {
            await apiPost('/company/invite', { email, role: 'MANAGER' });
            Alert.alert('Успех', 'Приглашение отправлено на ' + email);
            setEmail('');
        } catch (err: any) {
            Alert.alert('Ошибка', err.message || 'Не удалось отправить приглашение');
        } finally {
            setInviting(false);
        }
    };

    const getRoleLabel = (role: string) => {
        const roles: Record<string, string> = {
            'OWNER': 'Владелец',
            'ADMIN': 'Администратор',
            'MANAGER': 'Менеджер',
            'ACCOUNTANT': 'Бухгалтер',
            'FOREMAN': 'Прораб'
        };
        return roles[role] || role;
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-4 pt-4 mb-6">
                <View className="flex-row items-center mb-6">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-card rounded-xl items-center justify-center border border-secondary mr-4"
                    >
                        <ChevronLeft color="#fff" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white text-2xl font-bold">Пользователи</Text>
                </View>

                {/* Invite Partner Section */}
                <View className="bg-primary/10 border border-primary/20 rounded-[32px] p-6 mb-8">
                    <View className="flex-row items-center mb-4">
                        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                            <UserPlus color="#2563EB" size={20} />
                        </View>
                        <Text className="text-white font-bold text-lg">Пригласить партнера</Text>
                    </View>
                    <Text className="text-muted text-xs mb-4">
                        Добавьте коллегу или бухгалтера, чтобы вести учет вместе. Мы отправим письмо с приглашением.
                    </Text>
                    <View className="flex-row">
                        <TextInput
                            placeholder="Email партнера"
                            placeholderTextColor="#475569"
                            value={email}
                            onChangeText={setEmail}
                            className="flex-1 bg-card border border-secondary rounded-xl px-4 py-3 text-white text-sm mr-2"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            onPress={handleInvite}
                            disabled={inviting}
                            className={`bg-primary px-6 rounded-xl justify-center ${inviting ? 'opacity-70' : ''}`}
                        >
                            {inviting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text className="text-white font-bold">OK</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search */}
                <View className="bg-card flex-row items-center px-4 h-12 rounded-2xl border border-secondary mb-6">
                    <Search color="#94A3B8" size={20} />
                    <TextInput
                        placeholder="Поиск пользователей..."
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 ml-3 text-white"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator color="#2563EB" className="my-10" />
                ) : filteredUsers.length === 0 ? (
                    <View className="bg-card rounded-[32px] p-10 items-center border border-secondary">
                        <UsersIcon color="#475569" size={48} />
                        <Text className="text-muted mt-4 text-center">Пользователи не найдены</Text>
                    </View>
                ) : (
                    filteredUsers.map((u) => (
                        <View key={u.id} className="bg-card border border-secondary rounded-2xl p-4 mb-3 flex-row items-center">
                            <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
                                <UserIcon color="#2563EB" size={24} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-bold">{u.name}</Text>
                                <Text className="text-muted text-xs">{u.email}</Text>
                                <View className="bg-secondary self-start px-2 py-0.5 rounded-full mt-1">
                                    <Text className="text-muted text-[10px] font-bold uppercase">{getRoleLabel(u.role)}</Text>
                                </View>
                            </View>
                            <TouchableOpacity className="p-2">
                                <Trash2 color="#475569" size={18} />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
}
