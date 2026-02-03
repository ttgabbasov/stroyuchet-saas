'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Key, CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { apiPost } from '@/lib/api';

// ============================================
// Validation Schema
// ============================================

const resetPasswordSchema = z.object({
    code: z.string().min(6, 'Код должен содержать 6 цифр'),
    newPassword: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string().min(6, 'Минимум 6 символов'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordForm) => {
        setError(null);

        try {
            await apiPost('/auth/password/reset', {
                code: data.code,
                newPassword: data.newPassword,
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err?.response?.data?.error?.message || 'Ошибка сброса пароля');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <Card padding="lg" className="w-full max-w-sm text-center">
                    <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">Пароль изменен!</h1>
                    <p className="text-muted-foreground mb-6">
                        Ваш пароль успешно изменен. Теперь вы можете войти с новым паролем.
                    </p>
                    <Button
                        className="w-full"
                        onClick={() => router.push('/login')}
                    >
                        Войти
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Сброс пароля</h1>
                    <p className="text-muted-foreground mt-1">
                        Введите код из письма и новый пароль
                    </p>
                    {email && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Код отправлен на {email}
                        </p>
                    )}
                </div>

                <Card padding="lg">
                    {error && (
                        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/10 border border-danger-200 dark:border-danger-800 rounded-lg">
                            <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label="Код восстановления"
                            placeholder="123456"
                            leftIcon={<Key className="w-4 h-4" />}
                            error={errors.code?.message}
                            {...register('code')}
                        />

                        <Input
                            label="Новый пароль"
                            type="password"
                            placeholder="••••••••"
                            leftIcon={<Lock className="w-4 h-4" />}
                            error={errors.newPassword?.message}
                            {...register('newPassword')}
                        />

                        <Input
                            label="Подтвердите пароль"
                            type="password"
                            placeholder="••••••••"
                            leftIcon={<Lock className="w-4 h-4" />}
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={isSubmitting}
                        >
                            Сбросить пароль
                        </Button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <Link
                            href="/forgot-password"
                            className="block text-sm text-primary-600 dark:text-primary-400 hover:underline"
                        >
                            Не получили код?
                        </Link>
                        <Link
                            href="/login"
                            className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Вернуться ко входу
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Загрузка...</p>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
