'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/store/auth';
import { apiGet } from '@/lib/api';
import axios from 'axios';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, setAuth, user } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Если уже авторизован, ничего не делаем
      if (isAuthenticated) {
        setIsInitializing(false);
        return;
      }

      // Если есть данные пользователя в localStorage, пробуем восстановить сессию
      if (user) {
        try {
          // Если accessToken пуст (после перезагрузки), пробуем сначала обновить его
          const currentStore = useAuthStore.getState();
          if (!currentStore.accessToken) {
            try {
              // Прямой вызов refresh через axios (не через инцептор api.ts)
              const response = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
              if (response.data.success && response.data.data.accessToken) {
                setAuth(user, currentStore.company || user.companyId as any, response.data.data.accessToken);
              }
            } catch (e) {
              console.warn('Initial refresh attempt failed, trying direct /me');
            }
          }

          // Вызов /me для получения актуальных данных (роль, подписка и т.д.)
          const data = await apiGet<any>('/auth/me');
          if (!isMounted) return;

          if (data && data.user && data.company) {
            const token = useAuthStore.getState().accessToken;
            if (token) {
              setAuth(data.user, data.company, token);
              setIsInitializing(false);
              return;
            } else {
              // Ждем чуть-чуть обновления стора из интерцептора
              await new Promise(resolve => setTimeout(resolve, 200));
              const lateToken = useAuthStore.getState().accessToken;
              if (lateToken) {
                setAuth(data.user, data.company, lateToken);
                setIsInitializing(false);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Session recovery failed:', error);
        }
      }

      // Если восстановление не удалось
      if (isMounted) {
        setIsInitializing(false);
        router.push('/login');
      }
    };

    checkAuth();
    return () => { isMounted = false; };
  }, [isAuthenticated, user, setAuth, router]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          <p className="text-muted-foreground text-sm animate-pulse">Восстановление сессии...</p>
        </div>
      </div>
    );
  }

  // На случай если useEffect еще не сработал или произошла ошибка
  if (!isAuthenticated) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}
