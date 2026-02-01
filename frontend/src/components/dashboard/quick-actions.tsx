'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Plus } from 'lucide-react';

interface QuickActionTemplate {
  id: string;
  label: string;
  icon: string;
  color: string;
  type: string;
  categoryId?: string;
  categoryName?: string;
  description: string;
}

export function QuickActions() {
  const router = useRouter();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['quick-action-templates'],
    queryFn: () => apiGet<QuickActionTemplate[]>('/quick-actions/templates'),
  });

  const handleQuickAction = (template: QuickActionTemplate) => {
    // Формируем URL с параметрами
    const params = new URLSearchParams();
    params.set('type', template.type);
    if (template.categoryId) {
      params.set('categoryId', template.categoryId);
    }

    if (template.type === 'ADVANCE') {
      router.push('/advance/new');
    } else {
      router.push(`/transactions/new?${params.toString()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="w-20 h-20 bg-gray-200 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">Быстрые действия</h3>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleQuickAction(template)}
            className="flex flex-col items-center justify-center min-w-[80px] p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <span 
              className="text-2xl mb-1 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${template.color}20` }}
            >
              {template.icon}
            </span>
            <span className="text-xs font-medium text-gray-700 text-center whitespace-nowrap">
              {template.label}
            </span>
          </button>
        ))}
        
        {/* Кнопка "Ещё" */}
        <button
          onClick={() => router.push('/transactions/new')}
          className="flex flex-col items-center justify-center min-w-[80px] p-3 rounded-xl bg-gray-50 border border-dashed border-gray-300 hover:border-gray-400 transition-all"
        >
          <span className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-1">
            <Plus className="w-5 h-5 text-gray-400" />
          </span>
          <span className="text-xs font-medium text-gray-500">Другое</span>
        </button>
      </div>
    </div>
  );
}
