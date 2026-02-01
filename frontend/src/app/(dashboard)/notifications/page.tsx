'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bell, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui';
import { apiGet } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  isRead: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<Notification[]>('/notifications'),
  });

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'danger':
        return {
          bg: 'bg-[var(--danger-bg)] border-[var(--danger)]/20',
          icon: AlertCircle,
          iconColor: 'text-[var(--danger)]',
          iconBg: 'bg-[var(--danger)]/10',
        };
      case 'warning':
        return {
          bg: 'bg-warning-500/10 border-warning-500/20',
          icon: AlertTriangle,
          iconColor: 'text-warning-500',
          iconBg: 'bg-warning-500/10',
        };
      default:
        return {
          bg: 'bg-primary-500/10 border-primary-500/20',
          icon: Info,
          iconColor: 'text-primary-500',
          iconBg: 'bg-primary-500/10',
        };
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold">Уведомления</h1>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="lg">
                <div className="animate-pulse flex gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <Card padding="lg" className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Нет уведомлений</p>
            <p className="text-sm text-gray-400 mt-1">
              Здесь будут важные события и напоминания
            </p>
          </Card>
        ) : (
          <>
            {/* Группировка по severity */}
            {['danger', 'warning', 'info'].map((severity) => {
              const items = notifications.filter(n => n.severity === severity);
              if (items.length === 0) return null;

              const label = severity === 'danger' ? 'Требует внимания'
                : severity === 'warning' ? 'Предупреждения'
                  : 'Информация';

              return (
                <div key={severity} className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase px-1">
                    {label}
                  </h3>
                  {items.map((notification) => {
                    const styles = getSeverityStyles(notification.severity);
                    const Icon = styles.icon;

                    return (
                      <button
                        key={notification.id}
                        onClick={() => notification.actionUrl && router.push(notification.actionUrl)}
                        className={`w-full text-left p-4 rounded-xl border ${styles.bg} transition-all hover:shadow-sm`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${styles.iconColor}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{notification.title}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>

                            {notification.actionLabel && (
                              <span className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary-500 hover:text-primary-400">
                                {notification.actionLabel}
                                <ChevronRight className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
