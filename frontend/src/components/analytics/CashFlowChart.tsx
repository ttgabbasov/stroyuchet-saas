'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui';
import type { DailyHistory } from '@/types';
import { formatMoney, formatDate } from '@/types';

interface CashFlowChartProps {
    data: DailyHistory[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
    if (!data?.length) {
        return (
            <Card padding="lg" className="h-[400px] flex items-center justify-center text-muted-foreground">
                Нет данных за выбранный период
            </Card>
        );
    }

    return (
        <Card padding="lg" className="h-[400px]">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Динамика финансов</h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                    <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(val: any) => formatDate(String(val))}
                        stroke="var(--muted-foreground)"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        tickFormatter={(val) => new Intl.NumberFormat('ru-RU', { notation: 'compact' }).format(val / 100)}
                        stroke="var(--muted-foreground)"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        width={40}
                    />
                    <Tooltip
                        labelFormatter={(label: any) => formatDate(String(label))}
                        formatter={(value: any) => formatMoney(Number(value))}
                        contentStyle={{
                            backgroundColor: 'var(--card)',
                            color: 'var(--foreground)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                    />
                    <Legend
                        verticalAlign="top"
                        align="right"
                        layout="vertical"
                        iconSize={8}
                        wrapperStyle={{
                            paddingTop: '0px',
                            paddingRight: '10px',
                            fontSize: '11px',
                            fontWeight: 500
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="incomeCents"
                        name="Доход"
                        stroke="#10B981"
                        fillOpacity={1}
                        fill="url(#colorIncome)"
                        strokeWidth={2}
                    />
                    <Area
                        type="monotone"
                        dataKey="expenseCents"
                        name="Расход"
                        stroke="#EF4444"
                        fillOpacity={1}
                        fill="url(#colorExpense)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Card>
    );
}
