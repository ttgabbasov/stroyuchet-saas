import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api';

export interface Project {
    id: string;
    name: string;
    address?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
    progress: number;
    budgetCents: number;
    spentCents: number;
}

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const data = await apiGet<Project[]>('/projects');
            setProjects(data);
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки объектов');
            console.error('Projects fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refresh = () => fetchData(true);

    return { projects, loading, refreshing, error, refresh };
}
