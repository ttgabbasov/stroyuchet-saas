import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api';

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    allowedTypes: string[];
}

export interface CategoryGroup {
    id: string;
    name: string;
    categories: Category[];
}

export function useCategories(type?: string) {
    const [groups, setGroups] = useState<CategoryGroup[]>([]);
    const [ungrouped, setUngrouped] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await apiGet<{ groups: CategoryGroup[]; ungrouped: Category[] }>('/categories', { type });
            setGroups(result.groups);
            setUngrouped(result.ungrouped);
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки категорий');
            console.error('Categories fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { groups, ungrouped, loading, error, refresh: fetchData };
}
