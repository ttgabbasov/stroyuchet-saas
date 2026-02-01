'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Wallet, FileText, Star } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { apiPost } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useIsOwner } from '@/store/auth';

// ============================================
// Validation Schema
// ============================================

const moneySourceSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  description: z.string().optional(),
  isCompanyMain: z.boolean().optional(),
});

type MoneySourceForm = z.infer<typeof moneySourceSchema>;

// ============================================
// Page Component
// ============================================

export default function NewMoneySourcePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOwner = useIsOwner();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MoneySourceForm>({
    resolver: zodResolver(moneySourceSchema),
    defaultValues: {
      isCompanyMain: false,
    },
  });

  const isCompanyMain = watch('isCompanyMain');

  const onSubmit = async (data: MoneySourceForm) => {
    try {
      await apiPost('/money-sources', data);
      queryClient.invalidateQueries({ queryKey: ['money-sources'] });
      router.push('/money-sources');
    } catch (error) {
      console.error('Failed to create money source:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Новая касса</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 pb-24">
        {/* Name */}
        <Card padding="lg">
          <Input
            label="Название кассы"
            placeholder="Моя касса"
            leftIcon={<Wallet className="w-4 h-4" />}
            error={errors.name?.message}
            {...register('name')}
          />
        </Card>

        {/* Description */}
        <Card padding="lg">
          <Input
            label="Описание (опционально)"
            placeholder="Для каких целей используется касса"
            leftIcon={<FileText className="w-4 h-4" />}
            {...register('description')}
          />
        </Card>

        {/* Is Company Main */}
        {isOwner && (
          <Card padding="lg">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Star className={`w-5 h-5 ${isCompanyMain ? 'text-warning-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium text-foreground">Главная касса</p>
                  <p className="text-sm text-muted-foreground">
                    Видна всем сотрудникам компании
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isCompanyMain}
                onChange={(e) => setValue('isCompanyMain', e.target.checked)}
                className="w-5 h-5 rounded border-border bg-muted/50 text-primary-600 focus:ring-primary-500"
              />
            </label>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-primary-500/10 border-primary-500/20">
          <p className="text-sm text-primary-500">
            После создания кассы вы сможете добавить доступ для других сотрудников.
          </p>
        </Card>

        {/* Submit Button */}
        <div className="mt-6">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isSubmitting}
          >
            Создать кассу
          </Button>
        </div>
      </form>
    </div>
  );
}
