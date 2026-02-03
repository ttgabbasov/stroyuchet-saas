'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/store/auth';
import { apiGet } from '@/lib/api';

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
          // Вызов /me триггернет интерцептор на обновление токена (refresh)
          const data = await apiGet<any>('/auth/me');
          if (!isMounted) return;

          if (data && data.user && data.company) {
            const token = useAuthStore.getState().accessToken;
            // Если токен не пришел сразу (может быть задержка в интерцепторе), 
            // даем ему еще один шанс через 100мс
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
