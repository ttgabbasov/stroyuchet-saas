import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api';

export interface ReportData {
    totalIncomeCents: number;
    totalExpenseCents: number;
    cashFlowCents: number;
    categories: {
        name: string;
        amountCents: number;
        percentage: number;
    }[];
    monthlyTrend?: number; // percentage change
}

export type ReportPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export function useReportsData() {
    const [period, setPeriod] = useState<ReportPeriod>('MONTH');
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            // Calculate dateFrom based on period
            const dateTo = new Date().toISOString();
            const from = new Date();
            if (period === 'DAY') from.setHours(0, 0, 0, 0);
            else if (period === 'WEEK') from.setDate(from.getDate() - 7);
            else if (period === 'MONTH') from.setMonth(from.getMonth() - 1);
            else if (period === 'YEAR') from.setFullYear(from.getFullYear() - 1);
            const dateFrom = from.toISOString();

            // Fetch financial report summary
            const result = await apiGet<any>(`/transactions/analytics/summary?dateFrom=${dateFrom}&dateTo=${dateTo}`);

            setData({
                totalIncomeCents: result.totalIncomeCents,
                totalExpenseCents: result.totalExpenseCents,
                cashFlowCents: result.profitCents,
                categories: result.byCategory.map((c: any) => ({
                    name: c.categoryName,
                    amountCents: c.totalCents,
                    percentage: Math.round(c.percentage)
                })),
                monthlyTrend: result.monthlyTrend
            });
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки отчетов');
            console.error('Reports fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refresh = () => fetchData(true);

    return { data, loading, refreshing, error, refresh, period, setPeriod };
}
