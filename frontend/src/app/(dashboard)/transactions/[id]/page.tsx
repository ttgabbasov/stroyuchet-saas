'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Receipt, Wallet, FolderKanban, User, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, Button, AmountDisplay } from '@/components/ui';
import { useTransaction, useDeleteTransaction } from '@/lib/hooks';
import { formatDateFull, TYPE_LABELS } from '@/types';

// ============================================
// Transaction Detail Page
// ============================================

export default function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: transaction, isLoading } = useTransaction(params.id);
  const deleteMutation = useDeleteTransaction();

  const handleDelete = async () => {
    if (!confirm('Удалить эту операцию?')) return;

    try {
      await deleteMutation.mutateAsync(params.id);
      router.push('/transactions');
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Операция не найдена</p>
          <Button onClick={() => router.push('/transactions')}>
            К списку
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">
              Операция
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/transactions/${params.id}/edit`)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Pencil className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-5 h-5 text-danger-500" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Main Card */}
        <Card padding="lg">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: transaction.category.color + '20' }}
            >
              {transaction.category.icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{TYPE_LABELS[transaction.type]}</p>
              <AmountDisplay
                cents={transaction.amountCents}
                type={transaction.type}
                size="lg"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="font-medium text-foreground">{transaction.category.name}</p>
            {transaction.comment && (
              <p className="text-muted-foreground mt-1">{transaction.comment}</p>
            )}
          </div>
        </Card>

        {/* Details */}
        <Card padding="none">
          <DetailRow
            icon={<Calendar className="w-4 h-4" />}
            label="Дата"
            value={formatDateFull(transaction.date)}
          />

          <DetailRow
            icon={<Wallet className="w-4 h-4" />}
            label="Касса"
            value={transaction.moneySource.name}
          />

          {transaction.toMoneySource && (
            <DetailRow
              icon={<Wallet className="w-4 h-4" />}
              label="В кассу"
              value={transaction.toMoneySource.name}
            />
          )}

          {transaction.project && (
            <DetailRow
              icon={<FolderKanban className="w-4 h-4" />}
              label="Объект"
              value={transaction.project.name}
            />
          )}

          {transaction.payoutUser && (
            <DetailRow
              icon={<User className="w-4 h-4" />}
              label="Получатель"
              value={transaction.payoutUser.name}
            />
          )}

          <DetailRow
            icon={<Receipt className="w-4 h-4" />}
            label="Чек"
            value={
              transaction.receiptStatus === 'RECEIPT'
                ? 'Есть (посмотреть)'
                : transaction.receiptStatus === 'PENDING'
                  ? 'Ожидается'
                  : 'Нет'
            }
            valueColor={
              transaction.receiptStatus === 'RECEIPT'
                ? 'text-primary-500 hover:text-primary-400 underline decoration-dashed underline-offset-4'
                : transaction.receiptStatus === 'PENDING'
                  ? 'text-warning-500'
                  : 'text-muted-foreground'
            }
            onClick={
              transaction.receiptStatus === 'RECEIPT' && transaction.receiptUrl
                ? () => window.open(transaction.receiptUrl, '_blank')
                : undefined
            }
          />

          <DetailRow
            icon={<User className="w-4 h-4" />}
            label="Создал"
            value={transaction.createdBy.name}
            isLast
          />
        </Card>

        {/* Running Balance (if available) */}
        {transaction.runningBalanceCents !== undefined && (
          <Card padding="lg">
            <p className="text-sm text-muted-foreground mb-1">Нарастающий итог</p>
            <AmountDisplay
              cents={transaction.runningBalanceCents}
              type="balance"
              size="lg"
            />
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================
// Detail Row Component
// ============================================

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
  onClick?: () => void;
}

function DetailRow({ icon, label, value, valueColor, isLast, onClick }: DetailRowProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center justify-between px-4 py-3',
        !isLast && 'border-b border-border',
        onClick && 'cursor-pointer hover:bg-muted/30 transition-colors'
      )}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className={clsx('text-sm font-medium', valueColor || 'text-foreground')}>
        {value}
      </span>
    </div>
  );
}
