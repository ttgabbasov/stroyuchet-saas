'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FolderKanban,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, BalanceCard, AmountDisplay } from '@/components/ui';
import { apiGet } from '@/lib/api';
import { formatMoney, formatDate, TYPE_LABELS } from '@/types';
import type { ProjectBalance, Transaction, MoneySource } from '@/types';

// ============================================
// Dashboard Page
// ============================================

interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  totalBalance: ProjectBalance;
  topProjects: { id: string; name: string; balanceCents: number }[];
}

export default function DashboardPage() {
  // Fetch summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiGet<DashboardSummary>('/projects/summary'),
  });

  // Fetch money sources
  const { data: moneySources, isLoading: moneySourcesLoading } = useQuery({
    queryKey: ['money-sources'],
    queryFn: () => apiGet<MoneySource[]>('/money-sources'),
  });

  // Fetch recent transactions
  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () =>
      apiGet<Transaction[]>('/transactions', { limit: 5 }),
  });

  const totalCashBalance = moneySources?.reduce(
    (sum, ms) => sum + ms.balanceCents,
    0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        <BalanceCard
          label="Доходы"
          cents={summary?.totalBalance.totalIncomeCents || 0}
          type="income"
          icon={<TrendingUp className="w-4 h-4 text-success-600 dark:text-success-400" />}
        />
        <BalanceCard
          label="Расходы"
          cents={summary?.totalBalance.totalExpenseCents || 0}
          type="expense"
          icon={<TrendingDown className="w-4 h-4 text-danger-600 dark:text-danger-400" />}
        />
        <BalanceCard
          label="Баланс проектов"
          cents={summary?.totalBalance.balanceCents || 0}
          type="balance"
          icon={<FolderKanban className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
        />
        <BalanceCard
          label="В кассах"
          cents={totalCashBalance}
          type="balance"
          icon={<Wallet className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
        />
      </div>

      {/* Money Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Кассы</CardTitle>
          <Link
            href="/money-sources"
            className="text-sm text-primary-600 hover:underline flex items-center"
          >
            Все <ChevronRight className="w-4 h-4" />
          </Link>
        </CardHeader>

        {moneySourcesLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {moneySources?.slice(0, 3).map((ms) => (
              <Link
                key={ms.id}
                href={`/money-sources/${ms.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center transition-colors">
                    <Wallet className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{ms.name}</p>
                    <p className="text-xs text-muted-foreground">{ms.ownerName}</p>
                  </div>
                </div>
                <AmountDisplay cents={ms.balanceCents} type="balance" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Последние операции</CardTitle>
          <Link
            href="/transactions"
            className="text-sm text-primary-600 hover:underline flex items-center"
          >
            Все <ChevronRight className="w-4 h-4" />
          </Link>
        </CardHeader>

        {recentTransactions && recentTransactions.length > 0 ? (
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg isolation-auto"
                    style={{
                      backgroundColor: tx.category.color + '20',
                      border: `1px solid ${tx.category.color}40`
                    }}
                  >
                    {tx.category.icon}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {tx.category.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.date)} • {TYPE_LABELS[tx.type]}
                    </p>
                  </div>
                </div>
                <AmountDisplay cents={tx.amountCents} type={tx.type} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p>Нет операций</p>
            <Link
              href="/transactions/new"
              className="text-primary-600 hover:underline text-sm"
            >
              Добавить первую
            </Link>
          </div>
        )}
      </Card>

      {/* Active Projects */}
      {summary && summary.topProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Топ объектов</CardTitle>
            <Link
              href="/projects"
              className="text-sm text-primary-600 hover:underline flex items-center"
            >
              Все ({summary.totalProjects}) <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </CardHeader>

          <div className="space-y-2">
            {summary.topProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <p className="font-medium text-foreground">{project.name}</p>
                <AmountDisplay cents={project.balanceCents} type="balance" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
