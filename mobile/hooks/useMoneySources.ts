import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api';

export interface MoneySource {
    id: string;
    name: string;
    type: 'CASH' | 'BANK' | 'VIRTUAL';
    balanceCents: number;
    currency: string;
}

export function useMoneySources() {
    const [moneySources, setMoneySources] = useState<MoneySource[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const data = await apiGet<MoneySource[]>('/money-sources');
            setMoneySources(data);
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки касс');
            console.error('MoneySources fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refresh = () => fetchData(true);

    return { moneySources, loading, refreshing, error, refresh };
}
