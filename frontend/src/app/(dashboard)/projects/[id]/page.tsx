'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Plus,
  TrendingUp,
  TrendingDown,
  Receipt,
  MoreVertical,
} from 'lucide-react';
import { Card, Button, AmountDisplay, BalanceCard } from '@/components/ui';
import { useProject, useTransactions } from '@/lib/hooks';
import { formatDate, STATUS_LABELS, TYPE_LABELS } from '@/types';
import { clsx } from 'clsx';

// ============================================
// Project Detail Page
// ============================================

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: project, isLoading: projectLoading } = useProject(params.id);
  const { data: transactions, isLoading: txLoading } = useTransactions({
    projectId: params.id,
    limit: 10,
  });

  if (projectLoading) {
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

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Проект не найден</p>
          <Button onClick={() => router.push('/projects')}>К списку</Button>
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
            <div>
              <h1 className="text-lg font-semibold text-foreground truncate max-w-[200px]">
                {project.name}
              </h1>
              <span
                className={clsx(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  project.status === 'ACTIVE'
                    ? 'bg-[var(--success-bg)] text-[var(--success)]'
                    : project.status === 'COMPLETED'
                      ? 'bg-primary-500/10 text-primary-500'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {STATUS_LABELS[project.status]}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/projects/${params.id}/edit`)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Pencil className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3">
          <BalanceCard
            label="Доходы"
            cents={project.balance.totalIncomeCents}
            type="income"
            icon={<TrendingUp className="w-4 h-4 text-success-600" />}
          />
          <BalanceCard
            label="Расходы"
            cents={project.balance.totalExpenseCents}
            type="expense"
            icon={<TrendingDown className="w-4 h-4 text-danger-600" />}
          />
        </div>

        {/* Main Balance */}
        <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white">
          <p className="text-sm opacity-80 mb-1">Баланс проекта</p>
          <p className="text-2xl font-bold">
            {(project.balance.balanceCents / 100).toLocaleString('ru-RU')} ₽
          </p>
          {project.budgetCents && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm opacity-80">
                Бюджет: {(project.budgetCents / 100).toLocaleString('ru-RU')} ₽
              </p>
              <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (project.balance.totalExpenseCents / project.budgetCents) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Address */}
        {project.address && (
          <Card padding="lg">
            <p className="text-sm text-muted-foreground mb-1">Адрес</p>
            <p className="text-foreground">{project.address}</p>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Link href={`/transactions/new?projectId=${params.id}&type=INCOME`} className="flex-1">
            <Button variant="secondary" className="w-full" leftIcon={<TrendingUp className="w-4 h-4" />}>
              Доход
            </Button>
          </Link>
          <Link href={`/transactions/new?projectId=${params.id}&type=EXPENSE`} className="flex-1">
            <Button variant="secondary" className="w-full" leftIcon={<TrendingDown className="w-4 h-4" />}>
              Расход
            </Button>
          </Link>
        </div>

        {/* Recent Transactions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Последние операции</h2>
            <Link
              href={`/transactions?projectId=${params.id}`}
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
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
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
