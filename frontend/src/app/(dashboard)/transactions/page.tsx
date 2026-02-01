'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Filter, Search, Receipt } from 'lucide-react';
import { Card, Button, Input, AmountDisplay } from '@/components/ui';
import { apiGet } from '@/lib/api';
import { formatDate, TYPE_LABELS, TransactionType } from '@/types';
import type { Transaction } from '@/types';

// ============================================
// Transactions List Page
// ============================================

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { type: typeFilter }],
    queryFn: () =>
      apiGet<Transaction[]>('/transactions', {
        limit: 50,
        ...(typeFilter && { type: typeFilter }),
      }),
  });

  const typeFilters: { value: TransactionType | ''; label: string }[] = [
    { value: '', label: 'Все' },
    { value: 'INCOME', label: 'Доходы' },
    { value: 'EXPENSE', label: 'Расходы' },
    { value: 'PAYOUT', label: 'Выплаты' },
    { value: 'INTERNAL', label: 'Переводы' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Операции</h1>
        <Link href="/transactions/new">
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Добавить
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {typeFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setTypeFilter(filter.value)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${typeFilter === filter.value
              ? 'bg-primary-600 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((tx) => (
            <TransactionCard key={tx.id} transaction={tx} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground mb-4">Нет операций</p>
          <Link href="/transactions/new">
            <Button>Добавить первую</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Transaction Card
// ============================================

function TransactionCard({ transaction: tx }: { transaction: Transaction }) {
  return (
    <Link href={`/transactions/${tx.id}`}>
      <Card
        padding="none"
        className="p-2 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
            style={{ backgroundColor: tx.category.color + '20' }}
          >
            {tx.category.icon}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground truncate">
                {tx.category.name}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-normal">
                <span>{formatDate(tx.date)}</span>
                {tx.project && (
                  <>
                    <span>•</span>
                    <span className="truncate">{tx.project.name}</span>
                  </>
                )}
              </div>
            </div>
            {tx.comment && (
              <p className="text-xs text-muted-foreground truncate">{tx.comment}</p>
            )}
          </div>

          {/* Amount and Receipt Status */}
          <div className="flex items-center gap-2">
            {/* Receipt indicator */}
            {tx.receiptStatus === 'RECEIPT' && (
              <div className="w-1.5 h-1.5 rounded-full bg-success-500" title="Есть чек" />
            )}
            {tx.receiptStatus === 'PENDING' && (
              <div className="w-1.5 h-1.5 rounded-full bg-warning-500" title="Чек ожидается" />
            )}
            <AmountDisplay cents={tx.amountCents} type={tx.type} size="sm" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
