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

export function useReportsData() {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            // Fetch financial report summary (works better with current UI)
            const result = await apiGet<any>('/transactions/analytics/summary');

            // Map the result to match ReportData interface if needed
            // The structure is almost identical
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
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refresh = () => fetchData(true);

    return { data, loading, refreshing, error, refresh };
}
