'use client';

import { useState } from 'react';
import { ArrowLeft, Send, CheckCircle2, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/components/ui';
import { useUser } from '@/store/auth';
import { apiGet } from '@/lib/api';

export default function TelegramSettingsPage() {
    const router = useRouter();
    const user = useUser();
    const [loading, setLoading] = useState(false);
    const [linkData, setLinkData] = useState<{ token: string; link: string } | null>(null);

    const generateLink = async () => {
        setLoading(true);
        try {
            const response = await apiGet<{ token: string; link: string }>('/users/telegram-link');
            setLinkData(response);
        } catch (error) {
            console.error('Failed to generate link', error);
            alert('Ошибка при генерации ссылки');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Ссылка скопирована!');
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
                <div className="px-4 h-14 flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-semibold text-foreground">Telegram Бот</h1>
                </div>
            </header>

            <div className="p-4 space-y-6 max-w-2xl mx-auto">
                <Card padding="lg" className="space-y-4">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                            <Send className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Привязка бота</h2>
                            <p className="text-sm text-muted-foreground">Для работы прораба через Telegram</p>
                        </div>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Наш бот позволяет вносить расходы, комментарии и загружать чеки прямо с объекта, не заходя в систему через браузер.
                        Это значительно ускоряет работу в «поле».
                    </p>

                    {user?.telegramId ? (
                        <div className="bg-success-50 dark:bg-success-900/10 border border-success-100 dark:border-success-800 rounded-xl p-4 flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-success-600 dark:text-success-400" />
                            <div>
                                <p className="font-semibold text-success-800 dark:text-success-300">Аккаунт привязан</p>
                                <p className="text-xs text-success-600 dark:text-success-400">ID: {user.telegramId}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            {!linkData ? (
                                <Button
                                    onClick={generateLink}
                                    isLoading={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    Привязать Telegram
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-xl break-all font-mono text-xs border border-border text-foreground">
                                        {linkData.link}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button variant="secondary" onClick={() => copyToClipboard(linkData.link)} className="gap-2">
                                            <Copy className="w-4 h-4" />
                                            Копировать
                                        </Button>
                                        <Button onClick={() => window.open(linkData.link, '_blank')} className="gap-2 bg-blue-600">
                                            <ExternalLink className="w-4 h-4" />
                                            Открыть
                                        </Button>
                                    </div>

                                    <div className="text-center">
                                        <button
                                            onClick={generateLink}
                                            className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto transition-colors"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Обновить ссылку
                                        </button>
                                    </div>

                                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
                                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-tight">
                                            <strong>Инструкция:</strong> Перейдите по ссылке и нажмите кнопку <b>START</b> в Telegram.
                                            Бот автоматически узнает вас и привяжет аккаунт.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase px-1">Что умеет бот?</h3>
                    <Card padding="lg" className="space-y-4">
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-foreground">1</div>
                            <p className="text-sm text-muted-foreground">Быстрое добавление расхода (напишите просто сумму).</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-foreground">2</div>
                            <p className="text-sm text-muted-foreground">Выбор объекта (проекта) и категории прямо в Telegram.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-foreground">3</div>
                            <p className="text-sm text-muted-foreground">Загрузка фото чека/накладной (просто отправьте фото боту).</p>
                        </div>
                    </Card>
                </section>
            </div>
        </div>
    );
}
