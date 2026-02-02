'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { apiGet, apiPost } from '@/lib/api';
import type { AuthResponse } from '@/types';

// ============================================
// Validation Schema
// ============================================

const joinSchema = z.object({
    name: z.string().min(2, 'Минимум 2 символа'),
    email: z.string().email('Введите корректный email'),
    password: z.string().min(6, 'Минимум 6 символов'),
});

type JoinForm = z.infer<typeof joinSchema>;

interface InviteInfo {
    code: string;
    role: string;
    companyName: string;
    expiresAt: string;
}

export default function JoinPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const setAuth = useAuthStore((state) => state.setAuth);

    const [invite, setInvite] = useState<InviteInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<JoinForm>({
        resolver: zodResolver(joinSchema),
    });

    useEffect(() => {
        if (!code) {
            setError('Код приглашения не указан');
            setLoading(false);
            return;
        }

        const validateInvite = async () => {
            try {
                const data = await apiGet<InviteInfo>(`/auth/invites/validate/${code}`);
                setInvite(data);
            } catch (err: any) {
                setError(err?.response?.data?.error?.message || 'Недействительное приглашение');
            } finally {
                setLoading(false);
            }
        };

        validateInvite();
    }, [code]);

    const onSubmit = async (data: JoinForm) => {
        if (!code) return;
        setError(null);

        try {
            const response = await apiPost<AuthResponse>('/auth/join', {
                ...data,
                inviteCode: code,
            });

            setAuth(response.user, response.company, response.tokens.accessToken);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.error?.message || 'Ошибка регистрации');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Проверка приглашения...</p>
            </div>
        );
    }

    if (error || !invite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <Card padding="lg" className="w-full max-w-sm text-center">
                    <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">Упс!</h1>
                    <p className="text-muted-foreground mb-6">{error || 'Приглашение не найдено'}</p>
                    <Button className="w-full" onClick={() => router.push('/login')}>
                        Перейти ко входу
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">СтройУчёт</h1>
                    <p className="text-muted-foreground mt-1">Присоединение к команде</p>
                </div>

                <Card padding="lg">
                    <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-800">
                        <p className="text-sm text-muted-foreground mb-1">Вас пригласили в</p>
                        <p className="text-lg font-bold text-primary-700 dark:text-primary-300">{invite.companyName}</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label="Ваше имя"
                            placeholder="Иван Петров"
                            leftIcon={<User className="w-4 h-4" />}
                            error={errors.name?.message}
                            {...register('name')}
                        />

                        <Input
                            label="Email"
                            type="email"
                            placeholder="email@example.com"
                            leftIcon={<Mail className="w-4 h-4" />}
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <Input
                            label="Пароль"
                            type="password"
                            placeholder="••••••••"
                            leftIcon={<Lock className="w-4 h-4" />}
                            error={errors.password?.message}
                            {...register('password')}
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={isSubmitting}
                        >
                            Принять приглашение
                        </Button>
                    </form>

                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        Уже есть аккаунт?{' '}
                        <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:underline">
                            Войти
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
