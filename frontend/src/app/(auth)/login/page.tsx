'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { apiPost } from '@/lib/api';
import type { AuthResponse } from '@/types';
import { Checkbox, BackgroundSelector } from '@/components/auth/auth-ui';

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
  const { setAuth, background } = useAuthStore();
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
    <div className={`min-h-screen flex items-center justify-center px-4 transition-all duration-700 ${background}`}>
      <div className="w-full max-w-sm relative z-10">
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">СтройУчёт</h1>
          <p className="text-slate-400 mt-1">Вход в систему</p>
        </div>

        <Card padding="lg" className="backdrop-blur-xl bg-card/90 border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
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
              className="bg-slate-900/50 border-white/5 text-white"
            />

            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
              className="bg-slate-900/50 border-white/5 text-white"
            />

            <div className="flex items-center justify-between">
              <Checkbox
                label="Запомнить меня"
                checked={rememberMe}
                onChange={setRememberMe}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-600/20"
              isLoading={isSubmitting}
            >
              Войти
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Регистрация
            </Link>
          </div>

          <BackgroundSelector />
        </Card>
      </div>
    </div>
  );
}
