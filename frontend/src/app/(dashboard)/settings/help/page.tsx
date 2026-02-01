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
            href="https://docs.stroyuchet.ru"
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
