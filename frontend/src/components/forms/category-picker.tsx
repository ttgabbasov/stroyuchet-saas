'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { X, Check } from 'lucide-react';
import type { Category, CategoryGroup } from '@/types';

// ============================================
// Category Picker Component
// ============================================

interface CategoryPickerProps {
  groups: CategoryGroup[];
  ungrouped: Category[];
  value?: string;
  onChange: (categoryId: string) => void;
  error?: string;
}

export function CategoryPicker({
  groups,
  ungrouped,
  value,
  onChange,
  error,
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Find selected category
  const selectedCategory = [...ungrouped, ...groups.flatMap((g) => g.categories)].find(
    (c) => c.id === value
  );

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        Категория
      </label>

      {/* Selected display */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={clsx(
          'w-full flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors',
          'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
          error ? 'border-danger-500' : 'border-border hover:border-muted-foreground'
        )}
      >
        {selectedCategory ? (
          <>
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: selectedCategory.color + '20' }}
            >
              {selectedCategory.icon}
            </span>
            <span className="text-foreground">{selectedCategory.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Выберите категорию</span>
        )}
      </button>

      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Content */}
          <div className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-hidden border border-border shadow-2xl transition-colors">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Выберите категорию
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Categories */}
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {groups.map((group) => (
                <div key={group.id} className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {group.name}
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {group.categories.map((cat) => (
                      <CategoryButton
                        key={cat.id}
                        category={cat}
                        isSelected={cat.id === value}
                        onSelect={() => {
                          onChange(cat.id);
                          setIsOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {ungrouped.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Другие
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {ungrouped.map((cat) => (
                      <CategoryButton
                        key={cat.id}
                        category={cat}
                        isSelected={cat.id === value}
                        onSelect={() => {
                          onChange(cat.id);
                          setIsOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Category Button
// ============================================

interface CategoryButtonProps {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
}

function CategoryButton({ category, isSelected, onSelect }: CategoryButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'relative flex flex-col items-center p-3 rounded-xl border-2 transition-colors',
        isSelected
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-transparent bg-muted hover:bg-accent transition-colors'
      )}
    >
      {isSelected && (
        <div className="absolute top-1 right-1">
          <Check className="w-4 h-4 text-primary-500" />
        </div>
      )}
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1"
        style={{ backgroundColor: category.color + '30' }}
      >
        {category.icon}
      </span>
      <span className="text-xs text-foreground text-center line-clamp-2">
        {category.name}
      </span>
    </button>
  );
}
