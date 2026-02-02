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
            // Fetch financial report (using available analytics endpoint)
            const result = await apiGet<ReportData>('/transactions/analytics/reports/cash-flow');
            setData(result);
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
