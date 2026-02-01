'use client';

import { Card } from '@/components/ui';
import { formatMoney } from '@/types';
import type { CashFlowReport } from '@/types';
import { clsx } from 'clsx';

interface CashFlowTableProps {
    report: CashFlowReport;
}

export function CashFlowTable({ report }: CashFlowTableProps) {
    const { columns, categories, totals } = report;

    if (!columns.length) {
        return (
            <Card padding="lg" className="flex items-center justify-center h-40 text-muted-foreground">
                Нет данных для отображения отчета
            </Card>
        );
    }

    // Helper to format month header (e.g. "2024-01" -> "Янв 24")
    const formatMonth = (str: string) => {
        const [y, m] = str.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        return new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' }).format(date);
    };

    return (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                        <th className="px-4 py-3 border-b border-border sticky left-0 bg-card z-10 w-48 font-semibold">Категория</th>
                        {columns.map(col => (
                            <th key={col} className="px-4 py-3 border-b border-border text-right min-w-[100px]">
                                {formatMonth(col)}
                            </th>
                        ))}
                        <th className="px-4 py-3 border-b border-border text-right font-bold w-32">Итого</th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-border/50">
                    {/* INCOME SECTION */}
                    <tr className="bg-success-50/10 dark:bg-success-900/10">
                        <td colSpan={columns.length + 2} className="px-4 py-2 font-semibold text-success-700 dark:text-success-400">
                            Поступления
                        </td>
                    </tr>
                    {categories.income.map(row => (
                        <tr key={row.categoryId} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 sticky left-0 bg-card border-r border-border truncate max-w-[200px]" title={row.categoryName}>
                                {row.categoryName}
                            </td>
                            {columns.map(col => (
                                <td key={col} className="px-4 py-3 text-right text-muted-foreground">
                                    {row.values[col] > 0 ? formatMoney(row.values[col]) : '-'}
                                </td>
                            ))}
                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                                {formatMoney(row.total)}
                            </td>
                        </tr>
                    ))}
                    <tr className="bg-muted/30 font-bold border-t border-border">
                        <td className="px-4 py-3 sticky left-0 bg-muted border-r border-border">Итого поступлений</td>
                        {columns.map(col => (
                            <td key={col} className="px-4 py-3 text-right text-success-600 dark:text-success-400">
                                {formatMoney(totals.income[col])}
                            </td>
                        ))}
                        <td className="px-4 py-3 text-right text-success-700 dark:text-success-500 font-extrabold">
                            {formatMoney(Object.values(totals.income).reduce((a, b) => a + b, 0))}
                        </td>
                    </tr>

                    {/* SPACE */}
                    <tr className="h-4"></tr>

                    {/* EXPENSE SECTION */}
                    <tr className="bg-danger-50/10 dark:bg-danger-900/10">
                        <td colSpan={columns.length + 2} className="px-4 py-2 font-semibold text-danger-700 dark:text-danger-400">
                            Расходы
                        </td>
                    </tr>
                    {categories.expense.map(row => (
                        <tr key={row.categoryId} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 sticky left-0 bg-card border-r border-border truncate max-w-[200px]" title={row.categoryName}>
                                {row.categoryName}
                            </td>
                            {columns.map(col => (
                                <td key={col} className="px-4 py-3 text-right text-muted-foreground">
                                    {row.values[col] > 0 ? formatMoney(row.values[col]) : '-'}
                                </td>
                            ))}
                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                                {formatMoney(row.total)}
                            </td>
                        </tr>
                    ))}
                    <tr className="bg-muted/30 font-bold border-t border-border">
                        <td className="px-4 py-3 sticky left-0 bg-muted border-r border-border">Итого расходов</td>
                        {columns.map(col => (
                            <td key={col} className="px-4 py-3 text-right text-danger-600 dark:text-danger-400">
                                {formatMoney(totals.expense[col])}
                            </td>
                        ))}
                        <td className="px-4 py-3 text-right text-danger-700 dark:text-danger-500 font-extrabold">
                            {formatMoney(Object.values(totals.expense).reduce((a, b) => a + b, 0))}
                        </td>
                    </tr>

                    {/* SUMMARY SECTION */}
                    <tr className="h-8"></tr>
                    <tr className="bg-primary-600 text-white font-bold">
                        <td className="px-4 py-4 sticky left-0 bg-primary-600 border-r border-primary-500">ЧИСТЫЙ ПОТОК (ДДС)</td>
                        {columns.map(col => (
                            <td key={col} className="px-4 py-4 text-right">
                                {formatMoney(totals.balance[col])}
                            </td>
                        ))}
                        <td className="px-4 py-4 text-right">
                            {formatMoney(Object.values(totals.balance).reduce((a, b) => a + b, 0))}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
