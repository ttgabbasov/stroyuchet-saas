'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Calendar, Trash2 } from 'lucide-react';
import { Button, Input, Card, Select, MoneyInput } from '@/components/ui';
import { CategoryPicker } from '@/components/forms/category-picker';
import { ReceiptUpload } from '@/components/forms/receipt-upload';
import {
  useTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useMoneySources,
  useProjects,
  useCategories,
  useCompanyUsers,
} from '@/lib/hooks';
import type { TransactionType } from '@/types';

const formSchema = z.object({
  amountCents: z.number().min(1, 'Введите сумму'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  date: z.string().min(1, 'Выберите дату'),
  comment: z.string().optional(),
  receiptStatus: z.enum(['RECEIPT', 'NO_RECEIPT', 'PENDING']),
  receiptUrl: z.string().optional(),
  projectId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params.id as string;

  const { data: transaction, isLoading } = useTransaction(transactionId);
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const { data: moneySources } = useMoneySources();
  const { data: projects } = useProjects();
  const { data: categories } = useCategories(transaction?.type as TransactionType);
  const { data: users } = useCompanyUsers();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    values: transaction ? {
      amountCents: transaction.amountCents,
      categoryId: transaction.category.id,
      date: transaction.date?.split('T')[0],
      comment: transaction.comment || '',
      receiptStatus: transaction.receiptStatus,
      receiptUrl: transaction.receiptUrl || '',
      projectId: transaction.project?.id || '',
    } : undefined,
  });

  const onSubmit = async (data: FormData) => {
    try {
      await updateMutation.mutateAsync({ id: transactionId, data });
      router.push(`/transactions/${transactionId}`);
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить операцию? Это действие нельзя отменить.')) return;
    try {
      await deleteMutation.mutateAsync(transactionId);
      router.push('/transactions');
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    INCOME: 'Доход',
    EXPENSE: 'Расход',
    PAYOUT: 'Выплата',
    INTERNAL: 'Перевод',
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Редактировать операцию</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 pb-24">
        {/* Тип операции (readonly) */}
        <Card padding="lg">
          <p className="text-sm text-muted-foreground mb-1">Тип операции</p>
          <p className="font-medium text-foreground">{typeLabels[transaction?.type || ''] || transaction?.type}</p>
        </Card>

        {/* Сумма */}
        <Card padding="lg">
          <Controller
            name="amountCents"
            control={control}
            render={({ field }) => (
              <MoneyInput
                label="Сумма"
                value={field.value}
                onChange={field.onChange}
                error={errors.amountCents?.message}
              />
            )}
          />
        </Card>

        {/* Касса (readonly) */}
        <Card padding="lg">
          <p className="text-sm text-muted-foreground mb-1">Касса</p>
          <p className="font-medium text-foreground">
            {moneySources?.find((ms) => ms.id === transaction?.moneySource.id)?.name || '—'}
          </p>
        </Card>

        {/* Объект */}
        {transaction?.type !== 'INTERNAL' && (
          <Card padding="lg">
            <Select
              label="Объект"
              placeholder="Выберите объект"
              options={[
                { value: '', label: 'Без объекта' },
                ...(projects?.map((p) => ({ value: p.id, label: p.name })) || []),
              ]}
              {...register('projectId')}
            />
          </Card>
        )}

        {/* Категория */}
        <Card padding="lg">
          {categories && (
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <CategoryPicker
                  groups={categories.groups}
                  ungrouped={categories.ungrouped}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.categoryId?.message}
                />
              )}
            />
          )}
        </Card>

        {/* Дата */}
        <Card padding="lg">
          <Input
            type="date"
            label="Дата"
            leftIcon={<Calendar className="w-4 h-4" />}
            error={errors.date?.message}
            {...register('date')}
          />
        </Card>

        {/* Комментарий */}
        <Card padding="lg">
          <Input
            label="Комментарий"
            placeholder="Описание операции..."
            {...register('comment')}
          />
        </Card>

        {/* Чек */}
        {transaction?.type !== 'INTERNAL' && (
          <Card padding="lg">
            <Controller
              name="receiptStatus"
              control={control}
              render={({ field }) => (
                <ReceiptUpload
                  value={{
                    status: field.value,
                    url: watch('receiptUrl'),
                  }}
                  onChange={(val) => {
                    field.onChange(val.status);
                    setValue('receiptUrl', val.url);
                  }}
                />
              )}
            />
          </Card>
        )}

        <div className="space-y-3">
          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Сохранить изменения
          </Button>

          <Button
            type="button"
            variant="danger"
            className="w-full"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить операцию
          </Button>
        </div>
      </form>
    </div>
  );
}
