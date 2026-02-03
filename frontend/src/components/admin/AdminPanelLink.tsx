'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, ChevronRight } from 'lucide-react';
import { apiGet } from '@/lib/api';

export function AdminPanelLink() {
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSuperAdmin();
    }, []);

    const checkSuperAdmin = async () => {
        try {
            await apiGet('/admin/me');
            setIsSuperAdmin(true);
        } catch {
            setIsSuperAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !isSuperAdmin) {
        return null;
    }

    return (
        <div className="mb-8 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800 rounded-lg">
            <Link
                href="/admin"
                className="flex items-center justify-between group hover:opacity-80 transition-opacity"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">Панель администратора</p>
                        <p className="text-sm text-muted-foreground">Управление всеми пользователями и компаниями</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
}
