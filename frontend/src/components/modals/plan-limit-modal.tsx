'use client';

import { X, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'projects' | 'users' | 'moneySources';
  currentPlan: string;
  currentCount: number;
  limit: number;
}

const LIMIT_LABELS = {
  projects: 'объектов',
  users: 'пользователей',
  moneySources: 'касс',
};

const PLANS = [
  {
    name: 'FREE',
    label: 'Бесплатный',
    price: '0 ₽',
    limits: { projects: 1, users: 1, moneySources: 1 },
    features: ['1 объект', '1 пользователь', '1 касса', 'Базовый учёт'],
  },
  {
    name: 'PRO',
    label: 'Профессиональный',
    price: '990 ₽/мес',
    limits: { projects: 5, users: 5, moneySources: 5 },
    features: ['5 объектов', '5 пользователей', '5 касс', 'Экспорт в Excel', 'Приоритетная поддержка'],
    recommended: true,
  },
  {
    name: 'BUSINESS',
    label: 'Бизнес',
    price: '2 490 ₽/мес',
    limits: { projects: Infinity, users: Infinity, moneySources: Infinity },
    features: ['Безлимитные объекты', 'Безлимитные пользователи', 'Безлимитные кассы', 'Аналитика', 'API доступ', 'Персональный менеджер'],
  },
];

export function PlanLimitModal({
  isOpen,
  onClose,
  limitType,
  currentPlan,
  currentCount,
  limit,
}: PlanLimitModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    router.push('/settings/plan');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-warning-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Достигнут лимит тарифа
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message */}
          <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-6">
            <p className="text-warning-800">
              На тарифе <strong>{currentPlan}</strong> доступно максимум{' '}
              <strong>{limit} {LIMIT_LABELS[limitType]}</strong>.
              <br />
              У вас уже создано: <strong>{currentCount}</strong>.
            </p>
          </div>

          {/* Plans comparison */}
          <h3 className="font-semibold text-gray-900 mb-4">
            Выберите подходящий тариф
          </h3>

          <div className="space-y-3">
            {PLANS.map((plan) => {
              const isCurrentPlan = plan.name === currentPlan;
              const hasEnoughLimit = plan.limits[limitType] > currentCount;

              return (
                <div
                  key={plan.name}
                  className={`relative border-2 rounded-xl p-4 transition-colors ${
                    plan.recommended
                      ? 'border-primary-500 bg-primary-50'
                      : isCurrentPlan
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.recommended && (
                    <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary-600 text-white text-xs font-medium rounded-full">
                      Рекомендуем
                    </span>
                  )}

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{plan.label}</h4>
                        {isCurrentPlan && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                            Текущий
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {plan.price}
                      </p>
                    </div>

                    {!isCurrentPlan && hasEnoughLimit && (
                      <Button size="sm" onClick={handleUpgrade}>
                        Выбрать
                      </Button>
                    )}
                  </div>

                  <ul className="mt-3 space-y-1">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-success-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Позже
            </Button>
            <Button className="flex-1" onClick={handleUpgrade}>
              Перейти к тарифам
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
