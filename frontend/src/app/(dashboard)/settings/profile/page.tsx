'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, User, Mail, Phone, Save } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useUser, useAuthStore } from '@/store/auth';
import { apiPatch } from '@/lib/api';

const profileSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const user = useUser();
  const setUser = useAuthStore((state) => state.setUser);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      const response = await apiPatch<any>('/users/me', data);
      setUser(response);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Ошибка при сохранении');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Профиль</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        {success && (
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-800 dark:text-success-400 px-4 py-3 rounded-xl">
            Изменения сохранены
          </div>
        )}

        <Card padding="lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Имя"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email"
              leftIcon={<Mail className="w-4 h-4" />}
              value={user?.email || ''}
              disabled
            />
            <p className="text-xs text-muted-foreground -mt-3">Email нельзя изменить</p>

            <Input
              label="Телефон"
              leftIcon={<Phone className="w-4 h-4" />}
              placeholder="+7 (999) 123-45-67"
              {...register('phone')}
            />
          </div>
        </Card>

        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          <Save className="w-4 h-4 mr-2" />
          Сохранить
        </Button>
      </form>
    </div>
  );
}
