'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Wallet,
  Settings,
  Plus,
  BarChart3,
  LayoutPanelLeft,
} from 'lucide-react';
import { useUser, useCompany } from '@/store/auth';
import { ThemeToggle } from '../ui';
import { useEffect, useState } from 'react';

// ============================================
// Dashboard Layout
// ============================================

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = useUser();
  const company = useCompany();
  const pathname = usePathname();
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem('stroyuchet_company_logo');
    if (savedLogo) setLogo(savedLogo);
  }, []);

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
    { href: '/analytics', icon: BarChart3, label: 'Аналитика' },
    { href: '/reports', icon: LayoutPanelLeft, label: 'Отчеты' },
    { href: '/projects', icon: FolderKanban, label: 'Объекты' },
    { href: '/transactions', icon: Receipt, label: 'Операции' },
    { href: '/money-sources', icon: Wallet, label: 'Кассы' },
    { href: '/settings', icon: Settings, label: 'Настройки' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border shadow-sm isolation-auto">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">
                {company?.name || 'СтройУчёт'}
              </h1>
              <p className="text-[10px] text-muted-foreground">{user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Quick Add Button */}
            <Link
              href="/transactions/new"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-4 mb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-t border-border pb-safe transition-colors duration-300">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center justify-center w-16 h-full',
                  'transition-colors',
                  isActive
                    ? 'text-primary-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
