import { clsx } from 'clsx';
import { formatMoney, TransactionType } from '@/types';

// ============================================
// Amount Display Component
// ============================================

interface AmountDisplayProps {
  cents: number;
  type?: TransactionType | 'balance';
  size?: 'sm' | 'md' | 'lg';
  showSign?: boolean;
  className?: string;
}

export function AmountDisplay({
  cents,
  type,
  size = 'md',
  showSign = false,
  className,
}: AmountDisplayProps) {
  const isPositive = cents >= 0;

  // Determine color based on type or value
  let colorClass = 'text-foreground';

  if (type === 'INCOME') {
    colorClass = 'text-success-600 dark:text-success-400';
  } else if (type === 'EXPENSE' || type === 'PAYOUT') {
    colorClass = 'text-danger-600 dark:text-danger-400';
  } else if (type === 'INTERNAL') {
    colorClass = 'text-primary-600 dark:text-primary-400';
  } else if (type === 'balance') {
    colorClass = isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400';
  }

  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  const sign = showSign && cents !== 0 ? (isPositive ? '+' : '') : '';

  return (
    <span
      className={clsx(
        'font-medium tabular-nums',
        colorClass,
        sizes[size],
        className
      )}
    >
      {sign}{formatMoney(cents)}
    </span>
  );
}

// ============================================
// Balance Card Component
// ============================================

interface BalanceCardProps {
  label: string;
  cents: number;
  type?: 'income' | 'expense' | 'balance';
  icon?: React.ReactNode;
}

export function BalanceCard({ label, cents, type, icon }: BalanceCardProps) {
  const colorClasses = {
    income: 'bg-[var(--success-bg)] border-[var(--success)]/20',
    expense: 'bg-[var(--danger-bg)] border-[var(--danger)]/20',
    balance: cents >= 0
      ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800/30'
      : 'bg-[var(--danger-bg)] border-[var(--danger)]/20',
  };

  const textColors = {
    income: 'text-[var(--success)]',
    expense: 'text-[var(--danger)]',
    balance: cents >= 0 ? 'text-primary-700 dark:text-primary-400' : 'text-[var(--danger)]',
  };

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 transition-colors',
        type ? colorClasses[type] : 'bg-muted/50 border-border'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span
        className={clsx(
          'text-xl font-bold tabular-nums',
          type ? textColors[type] : 'text-foreground'
        )}
      >
        {formatMoney(cents)}
      </span>
    </div>
  );
}
