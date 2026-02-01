'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { apiPost } from '@/lib/api';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(6, 'Минимум 6 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function SecurityPage() {
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordForm) => {
    try {
      await apiPost('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Ошибка при смене пароля');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Безопасность</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {success && (
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-800 dark:text-success-400 px-4 py-3 rounded-xl">
            Пароль успешно изменён
          </div>
        )}

        <Card padding="lg">
          <h3 className="font-medium text-foreground mb-4">Изменить пароль</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <Input
                label="Текущий пароль"
                type={showCurrent ? 'text' : 'password'}
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Новый пароль"
                type={showNew ? 'text' : 'password'}
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Input
              label="Подтвердите пароль"
              type="password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Изменить пароль
            </Button>
          </form>
        </Card>

        <Card padding="lg">
          <h3 className="font-medium text-foreground mb-2">Активные сессии</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Вы вошли с этого устройства. Если заметили подозрительную активность, смените пароль.
          </p>
          <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg border border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">Текущий браузер</p>
              <p className="text-xs text-muted-foreground">Активен сейчас</p>
            </div>
            <span className="w-2 h-2 bg-success-500 rounded-full"></span>
          </div>
        </Card>
      </div>
    </div>
  );
}
