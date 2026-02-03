'use client';

import { useState } from 'react';
import { ArrowLeft, Download, Filter, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCashFlowReport, useProjects } from '@/lib/hooks';
import { CashFlowTable } from '@/components/analytics/CashFlowTable';
import { Card, Select, Input, Button } from '@/components/ui';
import { useUser } from '@/store/auth';
import { EquityReport } from '@/components/analytics/EquityReport';
import { clsx } from 'clsx';

export default function ReportsPage() {
    const router = useRouter();
    const user = useUser();

    // Check access for equity
    const showEquity = user && ['OWNER', 'PARTNER'].includes(user.role);
    const [activeTab, setActiveTab] = useState<'CASHFLOW' | 'EQUITY'>('CASHFLOW');

    // Default to last 6 months
    const defaultFrom = new Date();
    defaultFrom.setMonth(defaultFrom.getMonth() - 5);
    defaultFrom.setDate(1);

    const [projectId, setProjectId] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>(
        defaultFrom.toISOString().split('T')[0]
    );
    const [dateTo, setDateTo] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    const { data: report, isLoading } = useCashFlowReport({
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
        setDateFrom(defaultFrom.toISOString().split('T')[0]);
        setDateTo(new Date().toISOString().split('T')[0]);
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
                        <h1 className="text-lg font-semibold text-foreground">Отчеты (ДДС)</h1>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => window.print()} className="hidden md:flex gap-2">
                        <Download className="w-4 h-4" />
                        PDF / Печать
                    </Button>
                </div>

                {/* Tabs */}
                {
                    showEquity && (
                        <div className="px-4 mt-2">
                            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                                <button
                                    onClick={() => setActiveTab('CASHFLOW')}
                                    className={clsx(
                                        'flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                                        activeTab === 'CASHFLOW'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                                    )}
                                >
                                    Движение денег (ДДС)
                                </button>
                                <button
                                    onClick={() => setActiveTab('EQUITY')}
                                    className={clsx(
                                        'flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                                        activeTab === 'EQUITY'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                                    )}
                                >
                                    Взаиморасчеты (Equity)
                                </button>
                            </div>
                        </div>
                    )
                }
            </header >

            <div className="p-4 space-y-6 max-w-[1600px] mx-auto">

                {/* EQUITY TAB CONTENT */}
                {activeTab === 'EQUITY' && <EquityReport />}

                {/* CASHFLOW TAB CONTENT */}
                {activeTab === 'CASHFLOW' && (
                    <>
                        {/* Filters */}
                        <div className="space-y-4 bg-card p-4 rounded-xl shadow-sm border border-border">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="secondary"
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

                        {/* Report Content */}
                        {report && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-sm text-muted-foreground">
                                        Период: <span className="font-medium text-foreground">{report.period.from} — {report.period.to}</span>
                                    </p>
                                </div>
                                <CashFlowTable report={report} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}
