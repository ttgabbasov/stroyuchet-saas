import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api';

export interface DashboardSummary {
    totalBalanceCents: number;
    monthlyIncomeCents: number;
    monthlyExpenseCents: number;
}

export interface Transaction {
    id: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'PAYOUT';
    amountCents: number;
    category: string;
    comment?: string;
    date: string;
    projectName?: string;
}

export function useDashboardData() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            // Fetch summary
            const summaryData = await apiGet<DashboardSummary>('/projects/summary');
            setSummary(summaryData);

            // Fetch transactions
            const transactionsData = await apiGet<Transaction[]>('/transactions', { limit: 10 });
            setTransactions(transactionsData);
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки данных');
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refresh = () => fetchData(true);

    return { summary, transactions, loading, refreshing, error, refresh };
}
