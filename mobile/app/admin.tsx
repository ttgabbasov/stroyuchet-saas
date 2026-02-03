import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { apiGet, apiDelete, apiPatch } from '../lib/api';

// ============================================
// Types
// ============================================

interface AdminStats {
    users: {
        total: number;
        newLast30Days: number;
    };
    companies: {
        total: number;
        newLast30Days: number;
        byPlan: {
            FREE: number;
            PRO: number;
            BUSINESS: number;
        };
        active: {
            PRO: number;
            BUSINESS: number;
        };
    };
    projects: {
        total: number;
    };
    transactions: {
        total: number;
    };
    revenue: {
        mrr: number;
        currency: string;
    };
}

interface UserData {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
    company: {
        id: string;
        name: string;
        plan: 'FREE' | 'PRO' | 'BUSINESS';
        planExpiresAt: string | null;
        createdAt: string;
        usersCount: number;
        projectsCount: number;
    } | null;
}

// ============================================
// Admin Screen
// ============================================

export default function AdminScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<'ALL' | 'FREE' | 'PRO' | 'BUSINESS'>('ALL');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        checkSuperAdmin();
    }, []);

    useEffect(() => {
        if (isSuperAdmin) {
            loadData();
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        filterUsers();
    }, [searchQuery, selectedPlan, users]);

    const checkSuperAdmin = async () => {
        try {
            await apiGet('/admin/me');
            setIsSuperAdmin(true);
        } catch {
            setIsSuperAdmin(false);
            router.replace('/(tabs)');
        }
    };

    const loadData = async () => {
        try {
            const [statsData, usersData] = await Promise.all([
                apiGet<AdminStats>('/admin/stats'),
                apiGet<UserData[]>('/admin/users'),
            ]);
            setStats(statsData);
            setUsers(usersData);
            setFilteredUsers(usersData);
        } catch (error: any) {
            Alert.alert('Ошибка', 'Не удалось загрузить данные');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filterUsers = () => {
        let filtered = users;

        if (searchQuery) {
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.company?.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedPlan !== 'ALL') {
            filtered = filtered.filter(user => user.company?.plan === selectedPlan);
        }

        setFilteredUsers(filtered);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleDeleteUser = (userId: string, userName: string) => {
        Alert.alert(
            'Удалить пользователя?',
            `Вы уверены, что хотите удалить "${userName}"? Это действие необратимо!`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiDelete(`/admin/users/${userId}`);
                            loadData();
                        } catch (error: any) {
                            Alert.alert('Ошибка', 'Не удалось удалить пользователя');
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteCompany = (companyId: string, companyName: string) => {
        Alert.alert(
            'Удалить компанию?',
            `Вы уверены, что хотите удалить "${companyName}" и ВСЕХ её пользователей? Это действие необратимо!`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiDelete(`/admin/companies/${companyId}`);
                            loadData();
                        } catch (error: any) {
                            Alert.alert('Ошибка', 'Не удалось удалить компанию');
                        }
                    },
                },
            ]
        );
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
        }).format(cents);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ru-RU');
    };

    const getPlanColor = (plan: string) => {
        switch (plan) {
            case 'FREE': return isDark ? '#6B7280' : '#9CA3AF';
            case 'PRO': return isDark ? '#3B82F6' : '#2563EB';
            case 'BUSINESS': return isDark ? '#A855F7' : '#9333EA';
            default: return isDark ? '#6B7280' : '#9CA3AF';
        }
    };

    if (isSuperAdmin === null || loading) {
        return (
            <View style={[styles.container, styles.center, isDark && styles.containerDark]}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={[styles.loadingText, isDark && styles.textDark]}>
                    Загрузка...
                </Text>
            </View>
        );
    }

    if (isSuperAdmin === false) {
        return (
            <View style={[styles.container, styles.center, isDark && styles.containerDark]}>
                <Ionicons name="shield-outline" size={64} color="#EF4444" />
                <Text style={[styles.errorTitle, isDark && styles.textDark]}>
                    Доступ запрещен
                </Text>
                <Text style={[styles.errorText, isDark && styles.textMutedDark]}>
                    У вас нет прав для доступа к панели администратора
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, isDark && styles.containerDark]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? '#E5E7EB' : '#1F2937'} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Ionicons name="shield-checkmark" size={28} color="#3B82F6" />
                    <Text style={[styles.headerTitle, isDark && styles.textDark]}>
                        Админ-панель
                    </Text>
                </View>
            </View>

            {/* Stats */}
            {stats && (
                <View style={styles.statsContainer}>
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, isDark && styles.cardDark]}>
                            <Ionicons name="people-outline" size={24} color="#3B82F6" />
                            <Text style={[styles.statValue, isDark && styles.textDark]}>
                                {stats.users.total}
                            </Text>
                            <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>
                                Пользователей
                            </Text>
                            <Text style={styles.statChange}>
                                +{stats.users.newLast30Days} за месяц
                            </Text>
                        </View>

                        <View style={[styles.statCard, isDark && styles.cardDark]}>
                            <Ionicons name="business-outline" size={24} color="#3B82F6" />
                            <Text style={[styles.statValue, isDark && styles.textDark]}>
                                {stats.companies.total}
                            </Text>
                            <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>
                                Компаний
                            </Text>
                            <Text style={styles.statChange}>
                                +{stats.companies.newLast30Days} за месяц
                            </Text>
                        </View>

                        <View style={[styles.statCard, isDark && styles.cardDark]}>
                            <Ionicons name="cash-outline" size={24} color="#10B981" />
                            <Text style={[styles.statValue, isDark && styles.textDark]}>
                                {formatCurrency(stats.revenue.mrr)}
                            </Text>
                            <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>
                                MRR
                            </Text>
                            <Text style={[styles.statChange, { fontSize: 11 }]}>
                                PRO: {stats.companies.active.PRO} | BIZ: {stats.companies.active.BUSINESS}
                            </Text>
                        </View>

                        <View style={[styles.statCard, isDark && styles.cardDark]}>
                            <Ionicons name="folder-outline" size={24} color="#3B82F6" />
                            <Text style={[styles.statValue, isDark && styles.textDark]}>
                                {stats.projects.total}
                            </Text>
                            <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>
                                Проектов
                            </Text>
                            <Text style={[styles.statChange, { fontSize: 11 }]}>
                                {stats.transactions.total} транзакций
                            </Text>
                        </View>
                    </View>

                    {/* Plan Distribution */}
                    <View style={[styles.planCard, isDark && styles.cardDark]}>
                        <Text style={[styles.planTitle, isDark && styles.textDark]}>
                            Распределение по тарифам
                        </Text>
                        <View style={styles.planGrid}>
                            <View style={styles.planItem}>
                                <Text style={[styles.planValue, { color: getPlanColor('FREE') }]}>
                                    {stats.companies.byPlan.FREE}
                                </Text>
                                <Text style={[styles.planLabel, isDark && styles.textMutedDark]}>
                                    FREE
                                </Text>
                            </View>
                            <View style={styles.planItem}>
                                <Text style={[styles.planValue, { color: getPlanColor('PRO') }]}>
                                    {stats.companies.byPlan.PRO}
                                </Text>
                                <Text style={[styles.planLabel, isDark && styles.textMutedDark]}>
                                    PRO
                                </Text>
                            </View>
                            <View style={styles.planItem}>
                                <Text style={[styles.planValue, { color: getPlanColor('BUSINESS') }]}>
                                    {stats.companies.byPlan.BUSINESS}
                                </Text>
                                <Text style={[styles.planLabel, isDark && styles.textMutedDark]}>
                                    BUSINESS
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchInput, isDark && styles.inputDark]}>
                    <Ionicons name="search-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    <TextInput
                        style={[styles.searchInputText, isDark && styles.textDark]}
                        placeholder="Поиск..."
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                    {(['ALL', 'FREE', 'PRO', 'BUSINESS'] as const).map((plan) => (
                        <TouchableOpacity
                            key={plan}
                            style={[
                                styles.filterButton,
                                selectedPlan === plan && styles.filterButtonActive,
                                isDark && (selectedPlan === plan ? styles.filterButtonActiveDark : styles.filterButtonDark),
                            ]}
                            onPress={() => setSelectedPlan(plan)}
                        >
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    selectedPlan === plan && styles.filterButtonTextActive,
                                    isDark && (selectedPlan === plan ? styles.filterButtonTextActiveDark : styles.textDark),
                                ]}
                            >
                                {plan === 'ALL' ? 'Все' : plan}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Users List */}
            <View style={styles.usersContainer}>
                <Text style={[styles.usersTitle, isDark && styles.textDark]}>
                    Пользователи ({filteredUsers.length})
                </Text>

                {filteredUsers.map((user) => (
                    <View key={user.id} style={[styles.userCard, isDark && styles.cardDark]}>
                        <View style={styles.userHeader}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.userAvatarText}>
                                    {user.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={[styles.userName, isDark && styles.textDark]}>
                                    {user.name}
                                </Text>
                                <Text style={[styles.userEmail, isDark && styles.textMutedDark]}>
                                    {user.email}
                                </Text>
                                {user.company && (
                                    <View style={styles.userCompany}>
                                        <Text style={[styles.userCompanyName, isDark && styles.textMutedDark]}>
                                            {user.company.name}
                                        </Text>
                                        <View
                                            style={[
                                                styles.planBadge,
                                                { backgroundColor: getPlanColor(user.company.plan) + '20' },
                                            ]}
                                        >
                                            <Text style={[styles.planBadgeText, { color: getPlanColor(user.company.plan) }]}>
                                                {user.company.plan}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.userStats}>
                            <View style={styles.userStat}>
                                <Text style={[styles.userStatLabel, isDark && styles.textMutedDark]}>
                                    Роль
                                </Text>
                                <Text style={[styles.userStatValue, isDark && styles.textDark]}>
                                    {user.role}
                                </Text>
                            </View>
                            <View style={styles.userStat}>
                                <Text style={[styles.userStatLabel, isDark && styles.textMutedDark]}>
                                    Проекты
                                </Text>
                                <Text style={[styles.userStatValue, isDark && styles.textDark]}>
                                    {user.company?.projectsCount || 0}
                                </Text>
                            </View>
                            <View style={styles.userStat}>
                                <Text style={[styles.userStatLabel, isDark && styles.textMutedDark]}>
                                    Регистрация
                                </Text>
                                <Text style={[styles.userStatValue, isDark && styles.textDark]}>
                                    {formatDate(user.createdAt)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.userActions}>
                            {user.company && user.role === 'OWNER' && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.actionButtonDanger]}
                                    onPress={() => handleDeleteCompany(user.company!.id, user.company!.name)}
                                >
                                    <Ionicons name="business" size={16} color="#EF4444" />
                                    <Text style={styles.actionButtonTextDanger}>Удалить компанию</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonDanger]}
                                onPress={() => handleDeleteUser(user.id, user.name)}
                            >
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                <Text style={styles.actionButtonTextDanger}>Удалить</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#111827',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    errorTitle: {
        marginTop: 16,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    errorText: {
        marginTop: 8,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    header: {
        padding: 16,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        marginBottom: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statsContainer: {
        padding: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '47%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardDark: {
        backgroundColor: '#1F2937',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    statChange: {
        fontSize: 11,
        color: '#10B981',
        marginTop: 4,
    },
    planCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    planTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    planGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    planItem: {
        alignItems: 'center',
    },
    planValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    planLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    searchContainer: {
        padding: 16,
    },
    searchInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        gap: 8,
        marginBottom: 12,
    },
    inputDark: {
        backgroundColor: '#1F2937',
    },
    searchInputText: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
    },
    filterContainer: {
        flexDirection: 'row',
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    filterButtonDark: {
        backgroundColor: '#374151',
    },
    filterButtonActive: {
        backgroundColor: '#3B82F6',
    },
    filterButtonActiveDark: {
        backgroundColor: '#3B82F6',
    },
    filterButtonText: {
        fontSize: 14,
        color: '#6B7280',
    },
    filterButtonTextActive: {
        color: '#FFFFFF',
    },
    filterButtonTextActiveDark: {
        color: '#FFFFFF',
    },
    usersContainer: {
        padding: 16,
    },
    usersTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    userCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userAvatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    userEmail: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    userCompany: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    userCompanyName: {
        fontSize: 12,
        color: '#6B7280',
    },
    planBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    planBadgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
    userStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    userStat: {
        flex: 1,
    },
    userStatLabel: {
        fontSize: 11,
        color: '#6B7280',
    },
    userStatValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
        marginTop: 2,
    },
    userActions: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionButtonDanger: {
        backgroundColor: '#FEE2E2',
    },
    actionButtonTextDanger: {
        fontSize: 12,
        fontWeight: '500',
        color: '#EF4444',
    },
    textDark: {
        color: '#E5E7EB',
    },
    textMutedDark: {
        color: '#9CA3AF',
    },
});
