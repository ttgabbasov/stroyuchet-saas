'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Wallet, User, Calendar, FileText, CheckCircle } from 'lucide-react';
import { Button, Input, Card, Select, MoneyInput } from '@/components/ui';
import { useMoneySources, useCompanyUsers, useProjects } from '@/lib/hooks';
import { apiPost } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { ROLE_LABELS } from '@/types';

const advanceSchema = z.object({
  moneySourceId: z.string().min(1, 'Выберите кассу'),
  recipientUserId: z.string().min(1, 'Выберите получателя'),
  amountCents: z.number().min(1, 'Введите сумму'),
  date: z.string().min(1, 'Выберите дату'),
  projectId: z.string().optional(),
  comment: z.string().optional(),
});

type AdvanceForm = z.infer<typeof advanceSchema>;

interface AdvanceResult {
  transaction: { id: string; amountCents: number };
  recipientMoneySource: { id: string; name: string; isNew: boolean };
}

export default function NewAdvancePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<AdvanceResult | null>(null);

  const { data: moneySources } = useMoneySources();
  const { data: users } = useCompanyUsers();
  const { data: projects } = useProjects();

  // Фильтруем только FOREMAN и VIEWER для получателей подотчёта
  const recipients = users?.filter(u => u.role === 'FOREMAN' || u.role === 'VIEWER') || [];

  // Фильтруем только основные кассы (не подотчётные) для источника
  const sourceMoneySources = moneySources?.filter(ms => !ms.isAdvance) || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdvanceForm>({
    resolver: zodResolver(advanceSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const selectedRecipient = users?.find(u => u.id === watch('recipientUserId'));

  const onSubmit = async (data: AdvanceForm) => {
    try {
      // Используем системную категорию подотчёта
      const response = await apiPost<AdvanceResult>('/advance', {
        ...data,
        categoryId: 'advance_category_001', // Системная категория
      });

      setResult(response);
      queryClient.invalidateQueries({ queryKey: ['money-sources'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Ошибка при выдаче подотчёта');
    }
  };

  // Успешный результат
  if (result) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="px-4 h-14 flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">Подотчёт выдан</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <Card className="bg-[var(--success-bg)] border-[var(--success)]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[var(--success)]" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Подотчёт успешно выдан!</p>
                <p className="text-sm text-muted-foreground">
                  {(result.transaction.amountCents / 100).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 space-y-2 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Касса получателя:</span>
                <span className="font-medium text-foreground">{result.recipientMoneySource.name}</span>
              </div>
              {result.recipientMoneySource.isNew && (
                <p className="text-xs text-primary-500 bg-primary-500/10 px-2 py-1 rounded">
                  ✨ Касса создана автоматически
                </p>
              )}
            </div>
          </Card>

          <div className="space-y-3">
            <Button className="w-full" onClick={() => setResult(null)}>
              Выдать ещё
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => router.push('/money-sources')}>
              К списку касс
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Выдать подотчёт</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 pb-24">
        {/* Инфо */}
        <Card className="bg-primary-500/10 border-primary-500/20">
          <p className="text-sm text-primary-500">
            💡 При выдаче подотчёта автоматически создаётся касса для получателя,
            если её ещё нет. Сотрудник сможет тратить деньги и фиксировать расходы.
          </p>
        </Card>

        {/* Из кассы */}
        <Card padding="lg">
          <Select
            label="Из кассы"
            placeholder="Выберите кассу"
            error={errors.moneySourceId?.message}
            options={sourceMoneySources.map(ms => ({
              value: ms.id,
              label: `${ms.name} (${((ms.balanceCents || 0) / 100).toLocaleString('ru-RU')} ₽)`,
            }))}
            {...register('moneySourceId')}
          />
        </Card>

        {/* Получатель */}
        <Card padding="lg">
          <Select
            label="Кому выдать"
            placeholder="Выберите сотрудника"
            error={errors.recipientUserId?.message}
            options={recipients.map(u => ({
              value: u.id,
              label: `${u.name} (${ROLE_LABELS[u.role]})`,
            }))}
            {...register('recipientUserId')}
          />
          {selectedRecipient && (
            <p className="text-xs text-muted-foreground mt-2">
              Будет создана касса "Подотчёт: {selectedRecipient.name}"
            </p>
          )}
        </Card>

        {/* Сумма */}
        <Card padding="lg">
          <MoneyInput
            label="Сумма"
            value={watch('amountCents')}
            onChange={(cents) => setValue('amountCents', cents)}
            error={errors.amountCents?.message}
          />
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

        {/* Объект (опционально) */}
        <Card padding="lg">
          <Select
            label="Объект (опционально)"
            placeholder="Выберите объект"
            options={[
              { value: '', label: 'Без привязки к объекту' },
              ...(projects?.map(p => ({ value: p.id, label: p.name })) || []),
            ]}
            {...register('projectId')}
          />
        </Card>

        {/* Комментарий */}
        <Card padding="lg">
          <Input
            label="Комментарий (опционально)"
            placeholder="На что выдан подотчёт..."
            leftIcon={<FileText className="w-4 h-4" />}
            {...register('comment')}
          />
        </Card>

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          <Wallet className="w-4 h-4 mr-2" />
          Выдать подотчёт
        </Button>
      </form>
    </div>
  );
}
