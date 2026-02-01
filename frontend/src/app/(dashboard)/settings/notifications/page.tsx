'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Mail, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui';

export default function NotificationsPage() {
  const router = useRouter();

  const notifications = [
    { icon: Bell, label: 'Push-уведомления', description: 'Уведомления в браузере', enabled: true },
    { icon: Mail, label: 'Email-уведомления', description: 'Ежедневная сводка на почту', enabled: false },
    { icon: MessageSquare, label: 'Telegram', description: 'Мгновенные уведомления', enabled: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Уведомления</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card padding="none">
          {notifications.map((item, index) => (
            <div
              key={item.label}
              className={`flex items-center justify-between px-4 py-4 ${index < notifications.length - 1 ? 'border-b border-border' : ''
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
                <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </Card>

        <Card className="bg-muted/50 border-border">
          <p className="text-sm text-muted-foreground text-center">
            Скоро здесь появятся дополнительные настройки уведомлений
          </p>
        </Card>
      </div>
    </div>
  );
}
