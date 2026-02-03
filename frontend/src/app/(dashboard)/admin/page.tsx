'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, Building2, TrendingUp, DollarSign,
    Search, Filter, Trash2, Edit, Shield,
    UserCog, Calendar, Activity, AlertCircle
} from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { apiGet, apiDelete, apiPatch } from '@/lib/api';
import { Plan } from '@prisma/client';

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
        plan: Plan;
        planExpiresAt: string | null;
        createdAt: string;
        usersCount: number;
        projectsCount: number;
    } | null;
}

// ============================================
// Admin Dashboard
// ============================================

export default function AdminPage() {
    const router = useRouter();
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<Plan | 'ALL'>('ALL');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Проверка прав супер-админа
    useEffect(() => {
        checkSuperAdmin();
    }, []);

    // Загрузка данных
    useEffect(() => {
        if (isSuperAdmin) {
            loadStats();
            loadUsers();
        }
    }, [isSuperAdmin]);

    // Фильтрация пользователей
    useEffect(() => {
        let filtered = users;

        // Поиск
        if (searchQuery) {
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.company?.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Фильтр по тарифу
        if (selectedPlan !== 'ALL') {
            filtered = filtered.filter(user => user.company?.plan === selectedPlan);
        }

        setFilteredUsers(filtered);
    }, [searchQuery, selectedPlan, users]);

    const checkSuperAdmin = async () => {
        try {
            await apiGet('/admin/me');
            setIsSuperAdmin(true);
        } catch (err: any) {
            setIsSuperAdmin(false);
            if (err?.response?.status === 403) {
                router.push('/dashboard');
            }
        }
    };

    const loadStats = async () => {
        try {
            const data = await apiGet<AdminStats>('/admin/stats');
            setStats(data);
        } catch (err: any) {
            setError('Ошибка загрузки статистики');
        }
    };

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await apiGet<UserData[]>('/admin/users');
            setUsers(data);
            setFilteredUsers(data);
        } catch (err: any) {
            setError('Ошибка загрузки пользователей');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Удалить пользователя "${userName}"? Это действие необратимо!`)) {
            return;
        }

        try {
            await apiDelete(`/admin/users/${userId}`);
            loadUsers();
        } catch (err: any) {
            alert('Ошибка удаления пользователя: ' + (err?.response?.data?.error?.message || err.message));
        }
    };

    const handleDeleteCompany = async (companyId: string, companyName: string) => {
        if (!confirm(`Удалить компанию "${companyName}" и ВСЕХ её пользователей? Это действие необратимо!`)) {
            return;
        }

        try {
            await apiDelete(`/admin/companies/${companyId}`);
            loadUsers();
        } catch (err: any) {
            alert('Ошибка удаления компании: ' + (err?.response?.data?.error?.message || err.message));
        }
    };

    const handleChangePlan = async (companyId: string, companyName: string) => {
        const newPlan = prompt(`Изменить тариф для "${companyName}"\nВведите: FREE, PRO или BUSINESS`);

        if (!newPlan || !['FREE', 'PRO', 'BUSINESS'].includes(newPlan.toUpperCase())) {
            return;
        }

        let expiresAt = null;
        if (newPlan.toUpperCase() !== 'FREE') {
            const daysStr = prompt('На сколько дней выдать тариф? (оставьте пустым для бессрочного)');
            if (daysStr) {
                const days = parseInt(daysStr);
                if (!isNaN(days) && days > 0) {
                    const date = new Date();
                    date.setDate(date.getDate() + days);
                    expiresAt = date.toISOString();
                }
            }
        }

        try {
            await apiPatch(`/admin/companies/${companyId}/plan`, {
                plan: newPlan.toUpperCase(),
                expiresAt,
            });
            loadUsers();
            loadStats();
        } catch (err: any) {
            alert('Ошибка изменения тарифа: ' + (err?.response?.data?.error?.message || err.message));
        }
    };

    // Проверка доступа
    if (isSuperAdmin === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
                    <p className="text-muted-foreground">Проверка прав доступа...</p>
                </div>
            </div>
        );
    }

    if (isSuperAdmin === false) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card padding="lg" className="max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">Доступ запрещен</h1>
                    <p className="text-muted-foreground mb-4">
                        У вас нет прав для доступа к панели администратора
                    </p>
                    <Button onClick={() => router.push('/dashboard')}>
                        Вернуться на главную
                    </Button>
                </Card>
            </div>
        );
    }

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

    const getPlanBadgeColor = (plan: Plan) => {
        switch (plan) {
            case 'FREE': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
            case 'PRO': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
            case 'BUSINESS': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
            default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="w-8 h-8 text-primary" />
                        Панель администратора
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Управление пользователями и компаниями
                    </p>
                </div>
            </div>

            {error && (
                <Card padding="sm" className="mb-6 bg-danger-50 dark:bg-danger-900/10 border-danger-200 dark:border-danger-800">
                    <p className="text-danger-700 dark:text-danger-300">{error}</p>
                </Card>
            )}

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card padding="md">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Всего пользователей</p>
                                <p className="text-2xl font-bold">{stats.users.total}</p>
                                <p className="text-xs text-success mt-1">
                                    +{stats.users.newLast30Days} за 30 дней
                                </p>
                            </div>
                            <Users className="w-10 h-10 text-primary opacity-20" />
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Всего компаний</p>
                                <p className="text-2xl font-bold">{stats.companies.total}</p>
                                <p className="text-xs text-success mt-1">
                                    +{stats.companies.newLast30Days} за 30 дней
                                </p>
                            </div>
                            <Building2 className="w-10 h-10 text-primary opacity-20" />
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">MRR</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.revenue.mrr)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PRO: {stats.companies.active.PRO} | BIZ: {stats.companies.active.BUSINESS}
                                </p>
                            </div>
                            <DollarSign className="w-10 h-10 text-success opacity-20" />
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Всего проектов</p>
                                <p className="text-2xl font-bold">{stats.projects.total}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.transactions.total} транзакций
                                </p>
                            </div>
                            <Activity className="w-10 h-10 text-primary opacity-20" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Plan Stats */}
            {stats && (
                <Card padding="md" className="mb-8">
                    <h2 className="text-lg font-semibold mb-4">Распределение по тарифам</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">FREE</p>
                            <p className="text-2xl font-bold text-gray-600">{stats.companies.byPlan.FREE}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">PRO</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.companies.byPlan.PRO}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">BUSINESS</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.companies.byPlan.BUSINESS}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Users Table */}
            <Card padding="md">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Все пользователи ({filteredUsers.length})</h2>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Поиск..."
                            leftIcon={<Search className="w-4 h-4" />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64"
                        />
                        <select
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value as Plan | 'ALL')}
                            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                        >
                            <option value="ALL">Все тарифы</option>
                            <option value="FREE">FREE</option>
                            <option value="PRO">PRO</option>
                            <option value="BUSINESS">BUSINESS</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">Загрузка...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-border">
                                <tr className="text-left text-sm text-muted-foreground">
                                    <th className="pb-3 font-medium">Пользователь</th>
                                    <th className="pb-3 font-medium">Компания</th>
                                    <th className="pb-3 font-medium">Тариф</th>
                                    <th className="pb-3 font-medium">Роль</th>
                                    <th className="pb-3 font-medium">Проекты</th>
                                    <th className="pb-3 font-medium">Дата рег.</th>
                                    <th className="pb-3 font-medium text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                                        <td className="py-3">
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            {user.company ? (
                                                <div>
                                                    <p className="font-medium">{user.company.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {user.company.usersCount} польз.
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="py-3">
                                            {user.company && (
                                                <div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanBadgeColor(user.company.plan)}`}>
                                                        {user.company.plan}
                                                    </span>
                                                    {user.company.planExpiresAt && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            до {formatDate(user.company.planExpiresAt)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3">
                                            <span className="text-sm">{user.role}</span>
                                        </td>
                                        <td className="py-3">
                                            <span className="text-sm">{user.company?.projectsCount || 0}</span>
                                        </td>
                                        <td className="py-3">
                                            <span className="text-sm text-muted-foreground">
                                                {formatDate(user.createdAt)}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {user.company && user.role === 'OWNER' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleChangePlan(user.company!.id, user.company!.name)}
                                                            title="Изменить тариф"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteCompany(user.company!.id, user.company!.name)}
                                                            className="text-danger hover:bg-danger/10"
                                                            title="Удалить компанию"
                                                        >
                                                            <Building2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                                    className="text-danger hover:bg-danger/10"
                                                    title="Удалить пользователя"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Пользователи не найдены</p>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
