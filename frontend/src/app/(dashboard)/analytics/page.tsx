'use client';

import { useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon, Calendar, FileText, Percent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAnalyticsSummary, useProjects } from '@/lib/hooks';
import { ExpensesPieChart } from '@/components/analytics/ExpensesPieChart';
import { CashFlowChart } from '@/components/analytics/CashFlowChart';
import { Card, Select, Input, Button } from '@/components/ui';
import { formatMoney } from '@/types';

export default function AnalyticsPage() {
    const router = useRouter();
    const [projectId, setProjectId] = useState('');
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    const { data: summary, isLoading } = useAnalyticsSummary({
        projectId: projectId || undefined,
        dateFrom,
        dateTo,
    });

    const { data: projects } = useProjects();

    const setPeriod = (period: 'this_month' | 'last_month' | 'this_quarter' | 'this_year') => {
        const now = new Date();
        let start: Date;
        let end: Date;

        switch (period) {
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'this_quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), quarter * 3, 1);
                end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'this_year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return;
        }

        setDateFrom(start.toISOString().split('T')[0]);
        setDateTo(end.toISOString().split('T')[0]);
    };

    const handleReset = () => {
        setProjectId('');
        setPeriod('this_month');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
                <div className="px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-semibold text-foreground">Аналитика</h1>
                    </div>
                    <Link href="/reports">
                        <Button variant="secondary" size="sm" className="gap-2">
                            <FileText className="w-4 h-4" />
                            Таблица ДДС
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="p-4 space-y-6 max-w-7xl mx-auto">
                {/* Filters */}
                <div className="space-y-4 bg-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={dateFrom.endsWith('-01') ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setPeriod('this_month')}
                        >
                            Этот месяц
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setPeriod('last_month')}>
                            Прошлый месяц
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setPeriod('this_quarter')}>
                            Квартал
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setPeriod('this_year')}>
                            Год
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Select
                            label="Проект"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            options={[
                                { value: '', label: 'Все проекты' },
                                ...(projects?.map(p => ({ value: p.id, label: p.name })) || []),
                            ]}
                        />
                        <Input
                            type="date"
                            label="С"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <Input
                            type="date"
                            label="По"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                        <div className="flex items-end">
                            <Button variant="secondary" className="w-full" onClick={handleReset}>
                                Сбросить
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard
                            label="Доход"
                            value={summary.totalIncomeCents}
                            icon={TrendingUp}
                            color="text-[var(--success)]"
                            bg="bg-[var(--success-bg)]"
                        />
                        <SummaryCard
                            label="Расход"
                            value={summary.totalExpenseCents}
                            icon={TrendingDown}
                            color="text-[var(--danger)]"
                            bg="bg-[var(--danger-bg)]"
                        />
                        <SummaryCard
                            label="Прибыль"
                            value={summary.profitCents}
                            icon={Wallet}
                            color={summary.profitCents >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--danger)]'}
                            bg="bg-primary-50 dark:bg-primary-900/10"
                        />
                        <Card padding="lg" className="flex flex-col">
                            <div className="flex items-start justify-between mb-2">
                                <div className="p-2 rounded-lg bg-warning-50 dark:bg-warning-900/10">
                                    <Percent className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">Маржинальность</p>
                            <p className={`text-xl font-bold ${summary.profitMargin >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-danger-600 dark:text-danger-400'}`}>
                                {summary.profitMargin.toFixed(1)}%
                            </p>
                        </Card>
                    </div>
                )}

                {/* Charts */}
                {summary && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CashFlowChart data={summary.history} />
                        <ExpensesPieChart data={summary.byCategory} />
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <Card padding="lg">
            <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className={`text-xl font-bold text-foreground`}>
                {formatMoney(value)}
            </p>
        </Card>
    );
}
