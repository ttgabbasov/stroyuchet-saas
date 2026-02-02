'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Undo2, CheckCircle } from 'lucide-react';
import { Button, Card, Select, MoneyInput } from '@/components/ui';
import { useMoneySources } from '@/lib/hooks';
import { apiPost } from '@/lib/api';

interface ReturnResult {
  transaction: { id: string; amountCents: number };
  fromMoneySource: { id: string; name: string };
  toMoneySource: { id: string; name: string };
  remainingBalance: number;
}

interface ReturnAdvanceFormProps {
  advanceMoneySourceId: string;
  advanceBalance: number;
  onSuccess?: () => void;
}

function ReturnAdvanceForm({
  advanceMoneySourceId,
  advanceBalance,
  onSuccess
}: ReturnAdvanceFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<ReturnResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toMoneySourceId, setToMoneySourceId] = useState('');
  const [amountCents, setAmountCents] = useState<number | undefined>(undefined);
  const [returnAll, setReturnAll] = useState(true);

  const { data: moneySources } = useMoneySources();

  // Фильтруем только основные кассы (не подотчётные) для возврата
  const targetMoneySources = moneySources?.filter(ms => !ms.isAdvance && ms.id !== advanceMoneySourceId) || [];

  const handleSubmit = async () => {
    if (!toMoneySourceId) {
      alert('Выберите кассу для возврата');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiPost<ReturnResult>('/quick-actions/return-advance', {
        toMoneySourceId,
        amountCents: returnAll ? undefined : amountCents,
      });

      setResult(response);
      queryClient.invalidateQueries({ queryKey: ['money-sources'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onSuccess?.();
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Ошибка при возврате');
    } finally {
      setIsLoading(false);
    }
  };

  // Успешный результат
  if (result) {
    return (
      <Card className="bg-[var(--success-bg)] border-[var(--success)]/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[var(--success)]" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Остаток возвращён!</p>
            <p className="text-sm text-muted-foreground">
              {(result.transaction.amountCents / 100).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 space-y-2 text-sm border border-border">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Из кассы:</span>
            <span className="font-medium text-foreground">{result.fromMoneySource.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">В кассу:</span>
            <span className="font-medium text-foreground">{result.toMoneySource.name}</span>
          </div>
          {result.remainingBalance > 0 && (
            <div className="flex justify-between text-warning-500">
              <span>Осталось на подотчёте:</span>
              <span className="font-medium text-warning-500">
                {(result.remainingBalance / 100).toLocaleString('ru-RU')} ₽
              </span>
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          className="w-full mt-4"
          onClick={() => setResult(null)}
        >
          Вернуть ещё
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
          <Undo2 className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Вернуть остаток</h3>
          <p className="text-sm text-muted-foreground">
            На подотчёте: {(advanceBalance / 100).toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Куда вернуть */}
        <Select
          label="Вернуть в кассу"
          placeholder="Выберите кассу"
          value={toMoneySourceId}
          onChange={(e) => setToMoneySourceId(e.target.value)}
          options={targetMoneySources.map(ms => ({
            value: ms.id,
            label: ms.name,
          }))}
        />

        {/* Сумма */}
        <div>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setReturnAll(true)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${returnAll
                ? 'bg-primary-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
            >
              Весь остаток
            </button>
            <button
              type="button"
              onClick={() => setReturnAll(false)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${!returnAll
                ? 'bg-primary-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
            >
              Часть суммы
            </button>
          </div>

          {!returnAll && (
            <MoneyInput
              label="Сумма возврата"
              value={amountCents}
              onChange={setAmountCents}
              max={advanceBalance}
            />
          )}
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!toMoneySourceId}
        >
          Вернуть {returnAll
            ? `${(advanceBalance / 100).toLocaleString('ru-RU')} ₽`
            : amountCents
              ? `${(amountCents / 100).toLocaleString('ru-RU')} ₽`
              : ''
          }
        </Button>
      </div>
    </Card>
  );
}

// ============================================
// Отдельная страница возврата
// ============================================

export default function ReturnAdvancePage() {
  const router = useRouter();
  const { data: moneySources, isLoading } = useMoneySources();

  // Находим подотчётную кассу текущего пользователя
  const advanceSource = moneySources?.find((ms) => ms.isAdvance);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!advanceSource) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="px-4 h-14 flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Вернуть остаток</h1>
          </div>
        </header>

        <div className="p-4">
          <Card padding="lg" className="text-center">
            <p className="text-muted-foreground">У вас нет подотчётной кассы</p>
          </Card>
        </div>
      </div>
    );
  }

  const balance = advanceSource.balanceCents || 0;

  if (balance <= 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="px-4 h-14 flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Вернуть остаток</h1>
          </div>
        </header>

        <div className="p-4">
          <Card padding="lg" className="text-center">
            <p className="text-muted-foreground">На подотчёте нет денег для возврата</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Вернуть остаток</h1>
        </div>
      </header>

      <div className="p-4">
        <ReturnAdvanceForm
          advanceMoneySourceId={advanceSource.id}
          advanceBalance={balance}
          onSuccess={() => router.push('/money-sources')}
        />
      </div>
    </div>
  );
}
