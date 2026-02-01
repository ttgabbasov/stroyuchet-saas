'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { apiGet, apiPost } from '@/lib/api';

interface ProjectCloseSummary {
  project: {
    id: string;
    name: string;
    status: string;
    budgetCents?: number;
  };
  summary: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
    transactionCount: number;
    lastTransactionDate: string | null;
  };
  canClose: boolean;
}

interface CloseProjectModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CloseProjectModal({ projectId, isOpen, onClose }: CloseProjectModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['project-close-summary', projectId],
    queryFn: () => apiGet<ProjectCloseSummary>(`/quick-actions/project-close-summary/${projectId}`),
    enabled: isOpen,
  });

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await apiPost('/quick-actions/close-project', { projectId });
      setIsClosed(true);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Ошибка при закрытии');
    } finally {
      setIsClosing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">
            {isClosed ? 'Объект завершён' : 'Завершить объект?'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-20 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          ) : isClosed ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {data?.project.name}
              </p>
              <p className="text-gray-500 mt-1">
                Объект переведён в статус "Завершён"
              </p>
              <Button className="w-full mt-6" onClick={onClose}>
                Готово
              </Button>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Project name */}
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-900">{data.project.name}</p>
              </div>

              {/* Summary */}
              <Card className="bg-gray-50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Доходы:</span>
                    <span className="font-medium text-success-600">
                      +{(data.summary.incomeCents / 100).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Расходы:</span>
                    <span className="font-medium text-danger-600">
                      -{(data.summary.expenseCents / 100).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-700 font-medium">Баланс:</span>
                    <span className={`font-bold ${data.summary.balanceCents >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {data.summary.balanceCents >= 0 ? '+' : ''}{(data.summary.balanceCents / 100).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </Card>

              {/* Warning if balance is not zero */}
              {data.summary.balanceCents !== 0 && (
                <div className="flex gap-3 p-3 bg-warning-50 border border-warning-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-warning-800">
                    {data.summary.balanceCents > 0 
                      ? 'На объекте остался положительный баланс. Возможно, нужно сделать выплаты или перевести остаток.'
                      : 'Объект в минусе. Рекомендуется разобраться с финансами перед закрытием.'
                    }
                  </p>
                </div>
              )}

              {/* Stats */}
              <p className="text-sm text-gray-500 text-center">
                Операций: {data.summary.transactionCount}
                {data.summary.lastTransactionDate && (
                  <> • Последняя: {new Date(data.summary.lastTransactionDate).toLocaleDateString('ru-RU')}</>
                )}
              </p>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={onClose}>
                  Отмена
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleClose}
                  isLoading={isClosing}
                >
                  Завершить
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">Не удалось загрузить данные</p>
          )}
        </div>
      </div>
    </div>
  );
}
