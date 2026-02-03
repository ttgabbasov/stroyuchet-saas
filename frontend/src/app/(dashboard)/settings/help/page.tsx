'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, MessageCircle, Mail, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { useHelpItems } from '@/lib/hooks';

export default function HelpPage() {
  const router = useRouter();
  const { data: faq, isLoading } = useHelpItems();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Помощь</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Mobile Apps */}
        <Card padding="lg">
          <h3 className="font-medium text-foreground mb-3">Мобильное приложение</h3>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="#"
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.23-1.93 1.09-3.05-1.02.04-2.25.68-2.98 1.54-.65.76-1.22 1.91-1.07 3 1.13.08 2.21-.65 2.96-1.49" />
                </svg>
              </div>
              <span className="text-xs font-medium">App Store</span>
            </a>
            <a
              href="#"
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414L20.355 12.5094L17.523 9.6774L14.691 12.5094L17.523 15.3414ZM3.644 20.3344V4.6844L11.516 12.5094L3.644 20.3344ZM4.444 3.8844L12.316 11.7094L15.148 8.8774L5.644 3.3774C5.238 3.1424 4.819 3.0644 4.444 3.8844ZM5.644 21.6414L15.148 16.1414L12.316 13.3094L4.444 21.1344C4.819 21.9544 5.238 21.8764 5.644 21.6414Z" />
                </svg>
              </div>
              <span className="text-xs font-medium">Google Play</span>
            </a>
          </div>
          <p className="mt-3 text-[10px] text-center text-muted-foreground italic">
            * Ссылки появятся после публикации в сторах. Пока используйте Expo Go.
          </p>
        </Card>

        {/* Contact Options */}
        <Card padding="lg">
          <h3 className="font-medium text-foreground mb-3">Связаться с нами</h3>
          <div className="space-y-2">
            <a
              href="https://t.me/stroyuchet_support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Telegram</p>
                <p className="text-sm text-muted-foreground">Быстрые ответы</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a
              href="mailto:support@stroyuchet.ru"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">support@stroyuchet.ru</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </Card>

        {/* FAQ */}
        <Card padding="lg">
          <h3 className="font-medium text-foreground mb-3">Частые вопросы</h3>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            ) : faq?.length ? (
              faq.map((item, index) => (
                <div key={item.id || index} className="pb-4 border-b border-border/50 last:border-0 last:pb-0">
                  <p className="font-medium text-foreground mb-1">{item.question}</p>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">Вопросы пока не добавлены</p>
            )}
          </div>
        </Card>

        {/* Documentation */}
        <Card padding="lg">
          <a
            href="http://docs.tgabbasov.store"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3"
          >
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Документация</p>
              <p className="text-sm text-muted-foreground">Подробные инструкции</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </Card>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground">
          СтройУчёт v1.0.0
        </p>
      </div>
    </div>
  );
}
