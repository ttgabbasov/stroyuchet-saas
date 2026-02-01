'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Wallet, FileText, Star, Trash2 } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useMoneySource, useUpdateMoneySource, useDeleteMoneySource } from '@/lib/hooks';
import { useIsOwner } from '@/store/auth';

const moneySourceSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  description: z.string().optional(),
  isCompanyMain: z.boolean().optional(),
});

type MoneySourceForm = z.infer<typeof moneySourceSchema>;

export default function EditMoneySourcePage() {
  const router = useRouter();
  const params = useParams();
  const moneySourceId = params.id as string;
  const isOwner = useIsOwner();

  const { data: moneySource, isLoading } = useMoneySource(moneySourceId);
  const updateMutation = useUpdateMoneySource();
  const deleteMutation = useDeleteMoneySource();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MoneySourceForm>({
    resolver: zodResolver(moneySourceSchema),
    values: moneySource ? {
      name: moneySource.name,
      description: moneySource.description || '',
      isCompanyMain: moneySource.isCompanyMain,
    } : undefined,
  });

  const isCompanyMain = watch('isCompanyMain');

  const onSubmit = async (data: MoneySourceForm) => {
    try {
      await updateMutation.mutateAsync({ id: moneySourceId, data });
      router.push(`/money-sources/${moneySourceId}`);
    } catch (error) {
      console.error('Failed to update money source:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить кассу? Это действие нельзя отменить.')) return;
    try {
      await deleteMutation.mutateAsync(moneySourceId);
      router.push('/money-sources');
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Ошибка при удалении');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Редактировать кассу</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 pb-24">
        <Card padding="lg">
          <Input
            label="Название кассы"
            placeholder="Моя касса"
            leftIcon={<Wallet className="w-4 h-4" />}
            error={errors.name?.message}
            {...register('name')}
          />
        </Card>

        <Card padding="lg">
          <Input
            label="Описание (опционально)"
            placeholder="Для каких целей используется касса"
            leftIcon={<FileText className="w-4 h-4" />}
            {...register('description')}
          />
        </Card>

        {isOwner && (
          <Card padding="lg">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Star className={`w-5 h-5 ${isCompanyMain ? 'text-warning-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium text-foreground">Главная касса</p>
                  <p className="text-sm text-muted-foreground">Видна всем сотрудникам компании</p>
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

        <div className="space-y-3">
          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Сохранить изменения
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => router.push(`/money-sources/${moneySourceId}/share`)}
          >
            Управление доступами
          </Button>

          <Button
            type="button"
            variant="danger"
            className="w-full"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить кассу
          </Button>
        </div>
      </form>
    </div>
  );
}
