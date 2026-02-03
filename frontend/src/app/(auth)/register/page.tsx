'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Building2, Phone } from 'lucide-react';
import { Button, Input, Card, ThemeToggle } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { apiPost } from '@/lib/api';
import type { AuthResponse } from '@/types';
import { Checkbox } from '@/components/auth/auth-ui';

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
  const { setAuth } = useAuthStore();
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 transition-colors duration-300">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">СтройУчёт</h1>
          <p className="text-muted-foreground mt-1">Регистрация</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-100 dark:border-danger-800 text-danger-700 dark:text-danger-400 text-sm">
                {error}
              </div>
            )}

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
              label="Телефон"
              type="tel"
              placeholder="+7 999 123-45-67"
              leftIcon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Название компании"
              placeholder="ООО СтройМастер"
              leftIcon={<Building2 className="w-4 h-4" />}
              error={errors.companyName?.message}
              {...register('companyName')}
            />

            <div className="flex items-center justify-between py-1">
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
              Зарегистрироваться
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
