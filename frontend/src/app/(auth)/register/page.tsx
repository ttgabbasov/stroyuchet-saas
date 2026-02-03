'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Building2, Phone } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { apiPost } from '@/lib/api';
import type { AuthResponse } from '@/types';
import { Checkbox, BackgroundSelector } from '@/components/auth/auth-ui';

// ============================================
// Validation Schema
// ============================================

const registerSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  email: z.string().email('Введите корректный email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Минимум 6 символов'),
  companyName: z.string().min(2, 'Минимум 2 символа'),
});

type RegisterForm = z.infer<typeof registerSchema>;

// ============================================
// Register Page
// ============================================

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, background } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);

    try {
      const response = await apiPost<AuthResponse>('/auth/register', {
        ...data,
        rememberMe,
      });

      setAuth(response.user, response.company, response.tokens.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-8 transition-all duration-700 ${background}`}>
      <div className="w-full max-w-sm relative z-10">
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">СтройУчёт</h1>
          <p className="text-slate-400 mt-1">Регистрация</p>
        </div>

        <Card padding="lg" className="backdrop-blur-xl bg-card/90 border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Ваше имя"
              placeholder="Иван Петров"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
              className="bg-slate-900/50 border-white/5 text-white"
            />

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
              label="Телефон"
              type="tel"
              placeholder="+7 999 123-45-67"
              leftIcon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
              {...register('phone')}
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

            <Input
              label="Название компании"
              placeholder="ООО СтройМастер"
              leftIcon={<Building2 className="w-4 h-4" />}
              error={errors.companyName?.message}
              {...register('companyName')}
              className="bg-slate-900/50 border-white/5 text-white"
            />

            <div className="py-1">
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
              Зарегистрироваться
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Войти
            </Link>
          </div>

          <BackgroundSelector />
        </Card>
      </div>
    </div>
  );
}
