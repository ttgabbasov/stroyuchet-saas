'use client';

import { useRouter } from 'next/navigation';
import {
  User,
  Building2,
  LogOut,
  ChevronRight,
  Users,
  CreditCard,
  Bell,
  Shield,
  HelpCircle,
  Send,
  UserCog,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useUser, useCompany, useAuthStore } from '@/store/auth';
import { ROLE_LABELS } from '@/types';

// ============================================
// Settings Page
// ============================================

export default function SettingsPage() {
  const router = useRouter();
  const user = useUser();
  const company = useCompany();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    if (confirm('Выйти из аккаунта?')) {
      logout();
      router.push('/login');
    }
  };

  const menuItems = [
    {
      title: 'Аккаунт',
      items: [
        {
          icon: User,
          label: 'Профиль',
          href: '/settings/profile',
          value: user?.name,
        },
        {
          icon: Building2,
          label: 'Компания',
          href: '/settings/company',
          value: company?.name,
        },
      ],
    },
    {
      title: 'Команда',
      items: [
        {
          icon: Users,
          label: 'Пользователи',
          href: '/settings/users',
        },
      ],
    },
    {
      title: 'Подписка',
      items: [
        {
          icon: CreditCard,
          label: 'Тариф',
          href: '/settings/plan',
          value: company?.plan || 'FREE',
        },
      ],
    },
    // Admin panel is now checked via a separate API call in the component
    {
      title: 'Мобильное приложение',
      items: [
        {
          icon: Bell,
          label: 'Уведомления',
          href: '/settings/notifications',
        },
        {
          icon: Send,
          label: 'Telegram Бот',
          href: '/settings/telegram',
          value: user?.telegramId ? 'Привязан' : 'Не привязан',
        },
        {
          icon: CreditCard, // Using as placeholder or adding a new one
          label: 'Скачать для iOS',
          href: '/settings/help', // Link to help/download page
          value: 'App Store',
        },
        {
          icon: Building2, // Using as placeholder
          label: 'Скачать для Android',
          href: '/settings/help',
          value: 'Google Play',
        },
      ],
    },
    {
      title: 'Безопасность и помощь',
      items: [
        {
          icon: Shield,
          label: 'Безопасность',
          href: '/settings/security',
        },
        {
          icon: HelpCircle,
          label: 'Помощь и поддержка',
          href: '/settings/help',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Настройки</h1>
      </div>

      {/* User Card */}
      <Card padding="lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
            <span className="text-xl font-semibold text-primary-600 dark:text-primary-400">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">
              {user?.role ? ROLE_LABELS[user.role] : ''}
            </span>
          </div>
        </div>
      </Card>

      {/* Menu Sections */}
      {menuItems.map((section) => (
        <div key={section.title}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1">
            {section.title}
          </h2>
          <Card padding="none">
            {section.items.map((item, index) => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors ${index < section.items.length - 1
                  ? 'border-b border-border'
                  : ''
                  }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && (
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </Card>
        </div>
      ))}

      {/* Logout */}
      <Card padding="none">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Выйти</span>
        </button>
      </Card>

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground">
        СтройУчёт v1.0.0
      </p>
    </div>
  );
}
