'use client';

import { useState, useEffect, forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

// ============================================
// Money Input Component
// ============================================

export interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  value?: number; // in kopecks
  onChange?: (cents: number) => void;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, label, error, value, onChange, id, ...props }, ref) => {
    const inputId = id || props.name;

    // Display value in rubles
    const [displayValue, setDisplayValue] = useState(() => {
      if (value && value > 0) {
        return (value / 100).toString();
      }
      return '';
    });

    useEffect(() => {
      if (value !== undefined && value > 0) {
        setDisplayValue((value / 100).toString());
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
      setDisplayValue(raw);

      const numValue = parseFloat(raw);
      if (!isNaN(numValue) && numValue >= 0) {
        onChange?.(Math.round(numValue * 100));
      } else if (raw === '' || raw === '0') {
        onChange?.(0);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            className={clsx(
              'w-full rounded-lg border bg-card pl-3 pr-10 py-2 text-lg font-medium text-foreground transition-colors',
              'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
              'placeholder:text-muted-foreground disabled:bg-muted disabled:text-muted-foreground',
              error
                ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
                : 'border-border hover:border-muted-foreground',
              className
            )}
            placeholder="0"
            {...props}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
            ₽
          </span>
        </div>
        {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
      </div>
    );
  }
);

MoneyInput.displayName = 'MoneyInput';
