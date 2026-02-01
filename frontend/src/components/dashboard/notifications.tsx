'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, AlertTriangle, AlertCircle, Info, X, ChevronRight } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Card, Button } from '@/components/ui';

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

interface NotificationCount {
  total: number;
  danger: number;
  warning: number;
}

// ============================================
// Badge Component (для навбара)
// ============================================

export function NotificationBadge() {
  const { data } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => apiGet<NotificationCount>('/notifications/count'),
    refetchInterval: 60000, // Обновлять каждую минуту
  });

  if (!data || data.total === 0) {
    return (
      <Bell className="w-5 h-5 text-gray-400" />
    );
  }

  const badgeColor = data.danger > 0 
    ? 'bg-danger-500' 
    : data.warning > 0 
    ? 'bg-warning-500' 
    : 'bg-primary-500';

  return (
    <div className="relative">
      <Bell className="w-5 h-5 text-gray-600" />
      <span className={`absolute -top-1 -right-1 w-4 h-4 ${badgeColor} text-white text-xs rounded-full flex items-center justify-center`}>
        {data.total > 9 ? '9+' : data.total}
      </span>
    </div>
  );
}

// ============================================
// Notifications List Component
// ============================================

export function NotificationsList() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<Notification[]>('/notifications'),
  });

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  const handleAction = (notification: Notification) => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const visibleNotifications = notifications?.filter(n => !dismissed.has(n.id)) || [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Card key={i} padding="lg">
            <div className="animate-pulse flex gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (visibleNotifications.length === 0) {
    return null;
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'danger':
        return {
          bg: 'bg-danger-50 border-danger-200',
          icon: AlertCircle,
          iconColor: 'text-danger-600',
          iconBg: 'bg-danger-100',
        };
      case 'warning':
        return {
          bg: 'bg-warning-50 border-warning-200',
          icon: AlertTriangle,
          iconColor: 'text-warning-600',
          iconBg: 'bg-warning-100',
        };
      default:
        return {
          bg: 'bg-primary-50 border-primary-200',
          icon: Info,
          iconColor: 'text-primary-600',
          iconBg: 'bg-primary-100',
        };
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
        <Bell className="w-4 h-4" />
        Уведомления
      </h3>

      {visibleNotifications.slice(0, 3).map((notification) => {
        const styles = getSeverityStyles(notification.severity);
        const Icon = styles.icon;

        return (
          <div
            key={notification.id}
            className={`relative p-3 rounded-xl border ${styles.bg}`}
          >
            <button
              onClick={() => handleDismiss(notification.id)}
              className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <div className="flex gap-3 pr-6">
              <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${styles.iconColor}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                <p className="text-sm text-gray-600 truncate">{notification.message}</p>
                
                {notification.actionUrl && (
                  <button
                    onClick={() => handleAction(notification)}
                    className="mt-2 text-sm font-medium text-primary-600 flex items-center gap-1 hover:underline"
                  >
                    {notification.actionLabel || 'Подробнее'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {visibleNotifications.length > 3 && (
        <button
          onClick={() => router.push('/notifications')}
          className="w-full text-center text-sm text-primary-600 font-medium py-2 hover:underline"
        >
          Показать все ({visibleNotifications.length})
        </button>
      )}
    </div>
  );
}

// ============================================
// Notifications Dropdown (для хедера)
// ============================================

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<Notification[]>('/notifications'),
    enabled: isOpen,
  });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <NotificationBadge />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Уведомления</h3>
            </div>
            
            <div className="max-h-80 overflow-y-auto p-2">
              {!notifications || notifications.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Нет уведомлений</p>
              ) : (
                <div className="space-y-1">
                  {notifications.slice(0, 5).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (n.actionUrl) router.push(n.actionUrl);
                        setIsOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 truncate">{n.message}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {notifications && notifications.length > 5 && (
              <div className="p-2 border-t border-gray-100">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    router.push('/notifications');
                    setIsOpen(false);
                  }}
                >
                  Все уведомления
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
