'use client';

import { useState } from 'react';
import { ArrowLeft, Users, Building2, Crown, Calendar, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, Button } from '@/components/ui';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/types';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
    company: {
        id: string;
        name: string;
        plan: string;
        planExpiresAt: string | null;
        createdAt: string;
        usersCount: number;
        projectsCount: number;
    } | null;
}

const PLAN_LABELS: Record<string, string> = {
    FREE: 'Бесплатный',
    BASIC: 'Базовый',
    PRO: 'Профессиональный',
    ULTIMATE: 'Максимальный',
};

const PLAN_COLORS: Record<string, string> = {
    FREE: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    BASIC: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    PRO: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    ULTIMATE: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
};

export default function AdminPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: users, isLoading, error } = useQuery<AdminUser[]>({
        queryKey: ['admin', 'users'],
        queryFn: async () => {
            const res = await apiGet<{ data: AdminUser[] }>('/api/admin/users');
            return res.data;
        },
    });

    const filteredUsers = users?.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company?.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card padding="lg" className="max-w-md w-full text-center">
                    <p className="text-danger-600 dark:text-danger-400">
                        {(error as any).message || 'Ошибка загрузки данных'}
                    </p>
                    <Button onClick={() => router.back()} className="mt-4">
                        Назад
                    </Button>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    const stats = {
        totalUsers: users?.length || 0,
        totalCompanies: new Set(users?.map(u => u.company?.id).filter(Boolean)).size,
        freeUsers: users?.filter(u => u.company?.plan === 'FREE').length || 0,
        paidUsers: users?.filter(u => u.company?.plan !== 'FREE').length || 0,
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
                <div className="px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-semibold text-foreground">Панель администратора</h1>
                    </div>
                </div>
            </header>

            <div className="p-4 space-y-6 max-w-7xl mx-auto">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card padding="lg">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/10">
                                <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Пользователей</p>
                                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                            </div>
                        </div>
                    </Card>

                    <Card padding="lg">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10">
                                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Компаний</p>
                                <p className="text-2xl font-bold text-foreground">{stats.totalCompanies}</p>
                            </div>
                        </div>
                    </Card>

                    <Card padding="lg">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Free</p>
                                <p className="text-2xl font-bold text-foreground">{stats.freeUsers}</p>
                            </div>
                        </div>
                    </Card>

                    <Card padding="lg">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-success-50 dark:bg-success-900/10">
                                <Crown className="w-5 h-5 text-success-600 dark:text-success-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Платят</p>
                                <p className="text-2xl font-bold text-foreground">{stats.paidUsers}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Search */}
                <Card padding="lg">
                    <input
                        type="text"
                        placeholder="Поиск по имени, email или компании..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </Card>

                {/* Users Table */}
                <Card padding="none">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="text-left p-4 text-sm font-semibold text-foreground">Пользователь</th>
                                    <th className="text-left p-4 text-sm font-semibold text-foreground">Компания</th>
                                    <th className="text-left p-4 text-sm font-semibold text-foreground">Тариф</th>
                                    <th className="text-left p-4 text-sm font-semibold text-foreground">Роль</th>
                                    <th className="text-left p-4 text-sm font-semibold text-foreground">Статистика</th>
                                    <th className="text-left p-4 text-sm font-semibold text-foreground">Дата</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium text-foreground">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                                {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {user.company ? (
                                                <div>
                                                    <p className="font-medium text-foreground">{user.company.name}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {user.company.id.slice(0, 8)}</p>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {user.company && (
                                                <div>
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${PLAN_COLORS[user.company.plan] || PLAN_COLORS.FREE}`}>
                                                        {PLAN_LABELS[user.company.plan] || user.company.plan}
                                                    </span>
                                                    {user.company.planExpiresAt && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            до {formatDate(user.company.planExpiresAt)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${user.role === 'OWNER'
                                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {user.company && (
                                                <div className="flex gap-3 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {user.company.usersCount}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <TrendingUp className="w-3 h-3" />
                                                        {user.company.projectsCount}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(user.createdAt)}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">
                            {searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
