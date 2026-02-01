'use client';

import Link from 'next/link';
import { Plus, Wallet, ChevronRight, Users, Star } from 'lucide-react';
import { Card, Button, AmountDisplay } from '@/components/ui';
import { useMoneySources } from '@/lib/hooks';
import { useUser } from '@/store/auth';
import { clsx } from 'clsx';

// ============================================
// Money Sources List Page
// ============================================

export default function MoneySourcesPage() {
  const user = useUser();
  const { data: moneySources, isLoading } = useMoneySources();

  // Calculate total balance
  const totalBalance = moneySources?.reduce(
    (sum, ms) => sum + ms.balanceCents,
    0
  ) || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Кассы</h1>
        <Link href="/money-sources/new">
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Добавить
          </Button>
        </Link>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <p className="text-sm opacity-80 mb-1">Всего в кассах</p>
        <p className="text-2xl font-bold">
          {(totalBalance / 100).toLocaleString('ru-RU')} ₽
        </p>
      </Card>

      {/* Money Sources List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : moneySources && moneySources.length > 0 ? (
        <div className="space-y-2">
          {moneySources.map((ms) => {
            const isOwner = ms.ownerId === user?.id;
            const isMain = ms.isCompanyMain;

            return (
              <Link key={ms.id} href={`/money-sources/${ms.id}`}>
                <Card
                  padding="none"
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                        isMain
                          ? 'bg-warning-100 dark:bg-warning-900/20'
                          : isOwner
                            ? 'bg-primary-100 dark:bg-primary-900/20'
                            : 'bg-muted'
                      )}
                    >
                      <Wallet
                        className={clsx(
                          'w-5 h-5 transition-colors',
                          isMain
                            ? 'text-warning-600 dark:text-warning-400'
                            : isOwner
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-muted-foreground'
                        )}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {ms.name}
                        </p>
                        {isMain && (
                          <Star className="w-4 h-4 text-warning-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{ms.ownerName}</span>
                        {ms.sharedWith.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {ms.sharedWith.length}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="flex items-center gap-2">
                      <AmountDisplay
                        cents={ms.balanceCents}
                        type="balance"
                      />
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground mb-4">Нет касс</p>
          <Link href="/money-sources/new">
            <Button>Создать первую</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
