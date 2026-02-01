'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Users, ArrowLeftRight, Wallet, Calendar } from 'lucide-react';
import { Button, Input, Card, Select, MoneyInput } from '@/components/ui';
import { CategoryPicker } from '@/components/forms/category-picker';
import { ReceiptUpload } from '@/components/forms/receipt-upload';
import { useCreateTransaction, useMoneySources, useProjects, useCategories, useCompanyUsers } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { TransactionType, ReceiptStatus } from '@/types';

// ============================================
// Types
// ============================================

type TabType = 'INCOME' | 'EXPENSE' | 'PAYOUT' | 'INTERNAL' | 'ADVANCE';

const TABS: { type: TabType; label: string; icon: any; color: string }[] = [
  { type: 'INCOME', label: 'Доход', icon: ArrowDownLeft, color: 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/10' },
  { type: 'EXPENSE', label: 'Расход', icon: ArrowUpRight, color: 'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/10' },
  { type: 'PAYOUT', label: 'Выплата', icon: Users, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10' },
  { type: 'INTERNAL', label: 'Перевод', icon: ArrowLeftRight, color: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/10' },
  { type: 'ADVANCE', label: 'Подотчёт', icon: Wallet, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10' },
];

// ============================================
// Schema
// ============================================

const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'PAYOUT', 'INTERNAL', 'ADVANCE']),
  amountCents: z.number().min(1, 'Введите сумму'),
  moneySourceId: z.string().min(1, 'Выберите кассу'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  date: z.string().min(1, 'Выберите дату'),
  projectId: z.string().optional(),
  toMoneySourceId: z.string().optional(),
  payoutUserId: z.string().optional(),
  recipientUserId: z.string().optional(), // Для ADVANCE
  comment: z.string().optional(),
  receiptStatus: z.enum(['RECEIPT', 'NO_RECEIPT', 'PENDING']),
  receiptUrl: z.string().optional(),
});

type TransactionForm = z.infer<typeof transactionSchema>;

// ============================================
// Component
// ============================================

export default function NewTransactionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('EXPENSE');

  const { data: moneySources } = useMoneySources();
  const { data: projects } = useProjects();
  const { data: categories } = useCategories(activeTab);
  const { data: users } = useCompanyUsers();
  const createMutation = useCreateTransaction();

  // Фильтруем кассы
  const sourceMoneySources = moneySources?.filter(ms => !(ms as any).isAdvance) || [];
  const allMoneySources = moneySources || [];

  // Фильтруем пользователей для выплат/подотчёта
  const payoutUsers = users || [];
  const advanceRecipients = users?.filter(u => u.role === 'FOREMAN' || u.role === 'VIEWER') || [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
      receiptStatus: 'NO_RECEIPT',
    },
  });

  const handleTabChange = (type: TabType) => {
    setActiveTab(type);
    setValue('type', type);
    setValue('categoryId', ''); // Сбрасываем категорию при смене типа
  };

  const onSubmit = async (data: TransactionForm) => {
    try {
      // Для ADVANCE используем отдельный endpoint
      if (data.type === 'ADVANCE') {
        const response = await fetch('/api/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moneySourceId: data.moneySourceId,
            recipientUserId: data.recipientUserId,
            amountCents: data.amountCents,
            categoryId: data.categoryId,
            date: data.date,
            projectId: data.projectId || undefined,
            comment: data.comment,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Ошибка');
        }

        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['money-sources'] });
        router.push('/money-sources');
        return;
      }

      // Остальные типы
      await createMutation.mutateAsync(data as any);
      router.push('/transactions');
    } catch (error: any) {
      alert(error?.message || error?.response?.data?.error?.message || 'Ошибка');
    }
  };

  const needsProject = activeTab === 'INCOME' || activeTab === 'EXPENSE';
  const needsToMoneySource = activeTab === 'INTERNAL';
  const needsPayoutUser = activeTab === 'PAYOUT';
  const needsRecipientUser = activeTab === 'ADVANCE';
  const showReceipt = activeTab !== 'INTERNAL' && activeTab !== 'ADVANCE';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Новая операция</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 pb-24">
        {/* Type Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {TABS.map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTabChange(type)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-all min-w-[70px] ${activeTab === type
                ? `${color} border-current`
                : 'bg-card border-transparent text-muted-foreground'
                }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Amount */}
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

        {/* Money Source */}
        <Card padding="lg">
          <Select
            label={activeTab === 'INTERNAL' ? 'Из кассы' : 'Касса'}
            placeholder="Выберите кассу"
            error={errors.moneySourceId?.message}
            options={sourceMoneySources.map(ms => ({
              value: ms.id,
              label: `${ms.name} (${((ms.balanceCents || 0) / 100).toLocaleString('ru-RU')} ₽)`,
            }))}
            {...register('moneySourceId')}
          />
        </Card>

        {/* To Money Source (INTERNAL) */}
        {needsToMoneySource && (
          <Card padding="lg">
            <Select
              label="В кассу"
              placeholder="Выберите кассу-получатель"
              error={errors.toMoneySourceId?.message}
              options={allMoneySources
                .filter(ms => ms.id !== watch('moneySourceId'))
                .map(ms => ({
                  value: ms.id,
                  label: ms.name,
                }))}
              {...register('toMoneySourceId')}
            />
          </Card>
        )}

        {/* Payout User */}
        {needsPayoutUser && (
          <Card padding="lg">
            <Select
              label="Получатель выплаты"
              placeholder="Выберите сотрудника"
              error={errors.payoutUserId?.message}
              options={payoutUsers.map(u => ({
                value: u.id,
                label: u.name,
              }))}
              {...register('payoutUserId')}
            />
          </Card>
        )}

        {/* Recipient User (ADVANCE) */}
        {needsRecipientUser && (
          <Card padding="lg">
            <Select
              label="Кому выдать подотчёт"
              placeholder="Выберите сотрудника"
              error={errors.recipientUserId?.message}
              options={advanceRecipients.map(u => ({
                value: u.id,
                label: u.name,
              }))}
              {...register('recipientUserId')}
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 Касса для получателя создастся автоматически
            </p>
          </Card>
        )}

        {/* Project */}
        <Card padding="lg">
          <Select
            label={needsProject ? 'Объект' : 'Объект (опционально)'}
            placeholder="Выберите объект"
            error={errors.projectId?.message}
            options={[
              ...(needsProject ? [] : [{ value: '', label: 'Без объекта' }]),
              ...(projects?.map(p => ({ value: p.id, label: p.name })) || []),
            ]}
            {...register('projectId')}
          />
        </Card>

        {/* Category */}
        {categories && (
          <Card padding="lg">
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
          </Card>
        )}

        {/* Date */}
        <Card padding="lg">
          <Input
            type="date"
            label="Дата"
            leftIcon={<Calendar className="w-4 h-4" />}
            error={errors.date?.message}
            {...register('date')}
          />
        </Card>

        {/* Comment */}
        <Card padding="lg">
          <Input
            label="Комментарий"
            placeholder="Описание операции..."
            {...register('comment')}
          />
        </Card>

        {/* Receipt */}
        {showReceipt && (
          <Card padding="lg">
            <Controller
              name="receiptStatus"
              control={control}
              render={({ field }) => (
                <ReceiptUpload
                  value={{
                    status: field.value as ReceiptStatus,
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

        {/* Submit */}
        <div className="mt-6 pb-20">
          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Сохранить
          </Button>
        </div>
      </form>
    </div>
  );
}
