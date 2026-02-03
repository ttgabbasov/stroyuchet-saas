'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { apiPost } from '@/lib/api';

// ============================================
// Validation Schema
// ============================================

const forgotPasswordSchema = z.object({
    email: z.string().email('Введите корректный email'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch,
    } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const email = watch('email');

    const onSubmit = async (data: ForgotPasswordForm) => {
        setError(null);

        try {
            await apiPost('/auth/password/forgot', data);
            setSuccess(true);
        } catch (err: any) {
            setError(err?.response?.data?.error?.message || 'Ошибка отправки кода');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <Card padding="lg" className="w-full max-w-sm text-center">
                    <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">Код отправлен!</h1>
                    <p className="text-muted-foreground mb-6">
                        Код восстановления отправлен на {email}. Проверьте почту и используйте код для сброса пароля.
                    </p>
                    <Button
                        className="w-full"
                        onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
                    >
                        Ввести код
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full mt-2"
                        onClick={() => router.push('/login')}
                    >
                        Вернуться ко входу
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Восстановление пароля</h1>
                    <p className="text-muted-foreground mt-1">
                        Введите email для получения кода восстановления
                    </p>
                </div>

                <Card padding="lg">
                    {error && (
                        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/10 border border-danger-200 dark:border-danger-800 rounded-lg">
                            <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="email@example.com"
                            leftIcon={<Mail className="w-4 h-4" />}
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={isSubmitting}
                        >
                            Отправить код
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Вернуться ко входу
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
