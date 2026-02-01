'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from '@/components/ui';
import type { CategorySummary } from '@/types';
import { formatMoney } from '@/types';

interface ExpensesPieChartProps {
    data: CategorySummary[];
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

export function ExpensesPieChart({ data }: ExpensesPieChartProps) {
    if (!data.length) {
        return (
            <Card padding="lg" className="h-[400px] flex items-center justify-center text-muted-foreground">
                Нет данных за выбранный период
            </Card>
        );
    }

    // Filter out zero values and take top 10
    const chartData = data
        .filter(item => item.totalCents > 0)
        .sort((a, b) => b.totalCents - a.totalCents)
        .slice(0, 10);

    return (
        <Card padding="none" className="p-4 h-[420px] lg:h-[400px]">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Расходы по категориям</h3>

            <div className="flex flex-col md:flex-row h-[320px] gap-6">
                {/* Chart Segment */}
                <div className="flex-[1.5] h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={90}
                                paddingAngle={3}
                                dataKey="totalCents"
                                nameKey="categoryName"
                                animationBegin={0}
                                animationDuration={1000}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={entry.categoryId}
                                        fill={entry.color || COLORS[index % COLORS.length]}
                                        stroke="transparent"
                                        className="hover:opacity-80 transition-opacity cursor-pointer"
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any) => formatMoney(Number(value))}
                                contentStyle={{
                                    backgroundColor: 'var(--card)',
                                    color: 'var(--foreground)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    padding: '8px 12px'
                                }}
                                itemStyle={{ padding: '2px 0' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Label (Optional, but looks premium) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Всего</p>
                        <p className="text-sm font-bold text-foreground">
                            {formatMoney(chartData.reduce((sum, item) => sum + item.totalCents, 0))}
                        </p>
                    </div>
                </div>

                {/* Legend Column Segment */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 py-2">
                    {chartData.map((item, index) => {
                        const total = chartData.reduce((sum, i) => sum + i.totalCents, 0);
                        const percentage = ((item.totalCents / total) * 100).toFixed(1);
                        const color = item.color || COLORS[index % COLORS.length];

                        return (
                            <div
                                key={item.categoryId || index}
                                className="flex items-center justify-between gap-3 group cursor-default hover:bg-muted/30 p-1 rounded-lg transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: color }}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-foreground truncate leading-tight">
                                            {item.categoryName}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {percentage}%
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[11px] font-semibold text-foreground">
                                        {formatMoney(item.totalCents)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
