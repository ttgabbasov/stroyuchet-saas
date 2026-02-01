'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Users,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Receipt,
} from 'lucide-react';
import { Card, Button, AmountDisplay } from '@/components/ui';
import { useMoneySource, useTransactions } from '@/lib/hooks';
import { useUser } from '@/store/auth';
import { formatDate, TYPE_LABELS } from '@/types';
import { clsx } from 'clsx';

// ============================================
// Money Source Detail Page
// ============================================

export default function MoneySourceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const user = useUser();
  const { data: moneySource, isLoading: msLoading } = useMoneySource(params.id);
  const { data: transactions, isLoading: txLoading } = useTransactions({
    moneySourceId: params.id,
    limit: 10,
  });

  if (msLoading) {
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

  if (!moneySource) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Касса не найдена</p>
          <Button onClick={() => router.push('/money-sources')}>К списку</Button>
        </div>
      </div>
    );
  }

  const isOwner = moneySource.ownerId === user?.id;

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
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground truncate max-w-[200px]">
                {moneySource.name}
              </h1>
              {moneySource.isCompanyMain && (
                <Star className="w-4 h-4 text-warning-500" />
              )}
            </div>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => router.push(`/money-sources/${params.id}/edit`)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Pencil className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <Card
          className={clsx(
            'text-white',
            moneySource.balanceCents >= 0
              ? 'bg-gradient-to-br from-primary-600 to-primary-700'
              : 'bg-gradient-to-br from-danger-600 to-danger-700'
          )}
        >
          <p className="text-sm opacity-80 mb-1">Баланс кассы</p>
          <p className="text-3xl font-bold">
            {(moneySource.balanceCents / 100).toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-sm opacity-80 mt-2">
            Владелец: {moneySource.ownerName}
          </p>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Link href={`/transactions/new?moneySourceId=${params.id}&type=INCOME`} className="flex-1">
            <Button
              variant="secondary"
              className="w-full"
              leftIcon={<ArrowDownRight className="w-4 h-4 text-success-600" />}
            >
              Приход
            </Button>
          </Link>
          <Link href={`/transactions/new?moneySourceId=${params.id}&type=EXPENSE`} className="flex-1">
            <Button
              variant="secondary"
              className="w-full"
              leftIcon={<ArrowUpRight className="w-4 h-4 text-danger-600" />}
            >
              Расход
            </Button>
          </Link>
          <Link href={`/transactions/new?moneySourceId=${params.id}&type=INTERNAL`} className="flex-1">
            <Button
              variant="secondary"
              className="w-full"
              leftIcon={<ArrowLeftRight className="w-4 h-4 text-primary-600" />}
            >
              Перевод
            </Button>
          </Link>
        </div>

        {/* Shared With */}
        {moneySource.sharedWith.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Доступ
              </h2>
              {isOwner && (
                <button
                  onClick={() => router.push(`/money-sources/${params.id}/share`)}
                  className="text-sm text-primary-500 hover:underline"
                >
                  Изменить
                </button>
              )}
            </div>
            <div className="space-y-2">
              {moneySource.sharedWith.map((access) => (
                <div
                  key={access.userId}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-foreground">{access.userName}</span>
                  <div className="flex gap-2">
                    {access.canView && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Просмотр
                      </span>
                    )}
                    {access.canSpend && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500">
                        Расход
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Description */}
        {moneySource.description && (
          <Card padding="lg">
            <p className="text-sm text-muted-foreground mb-1">Описание</p>
            <p className="text-foreground">{moneySource.description}</p>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Последние операции</h2>
            <Link
              href={`/transactions?moneySourceId=${params.id}`}
              className="text-sm text-primary-500 hover:underline"
            >
              Все
            </Link>
          </div>

          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <Link
                  key={tx.id}
                  href={`/transactions/${tx.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: tx.category.color + '20' }}
                    >
                      {tx.category.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {tx.category.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.date)} • {TYPE_LABELS[tx.type]}
                      </p>
                    </div>
                  </div>
                  <AmountDisplay cents={tx.amountCents} type={tx.type} size="sm" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Нет операций</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
