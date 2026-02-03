'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Button, Input, Card, ThemeToggle } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { apiPost } from '@/lib/api';
import type { AuthResponse } from '@/types';
import { Checkbox } from '@/components/auth/auth-ui';

// ============================================
// Validation Schema
// ============================================

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

type LoginForm = z.infer<typeof loginSchema>;

// ============================================
// Login Page
// ============================================

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);

    try {
      const response = await apiPost<AuthResponse>('/auth/login', {
        ...data,
        rememberMe,
      });

      setAuth(response.user, response.company, response.tokens.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Ошибка входа';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 transition-colors duration-300">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">СтройУчёт</h1>
          <p className="text-muted-foreground mt-1">Вход в систему</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-100 dark:border-danger-800 text-danger-700 dark:text-danger-400 text-sm">
                {error}
              </div>
            )}

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

            <div className="flex items-center justify-between">
              <Checkbox
                label="Запомнить меня"
                checked={rememberMe}
                onChange={setRememberMe}
              />
              <ThemeToggle />
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
            >
              Войти
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-primary-600 dark:text-primary-400 hover:underline">
              Регистрация
            </Link>
          </div>

          <div className="mt-2 text-center text-sm">
            <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground underline transition-colors">
              Забыли пароль?
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
