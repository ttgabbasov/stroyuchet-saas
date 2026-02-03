import { SelectHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

// ============================================
// Select Component
// ============================================

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              'w-full rounded-lg border bg-card text-sm appearance-none px-3 py-2 pr-10 text-foreground transition-colors',
              'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
              'disabled:bg-muted disabled:text-muted-foreground',
              error
                ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
                : 'border-border hover:border-muted-foreground',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
