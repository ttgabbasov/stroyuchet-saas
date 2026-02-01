'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Zap, Building2, Rocket } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useCompany } from '@/store/auth';

// ============================================
// Plans Data
// ============================================

const PLANS = [
  {
    id: 'FREE',
    name: 'Бесплатный',
    description: 'Для начала работы',
    price: 0,
    priceLabel: '0 ₽',
    period: 'навсегда',
    icon: Zap,
    iconColor: 'text-muted-foreground',
    iconBg: 'bg-muted',
    features: [
      { text: '1 объект', included: true },
      { text: '1 пользователь', included: true },
      { text: '1 касса', included: true },
      { text: 'Базовый учёт доходов и расходов', included: true },
      { text: 'Экспорт в Excel', included: false },
      { text: 'Аналитика', included: false },
      { text: 'API доступ', included: false },
    ],
  },
  {
    id: 'PRO',
    name: 'Профессиональный',
    description: 'Для растущего бизнеса',
    price: 990,
    priceLabel: '990 ₽',
    period: 'в месяц',
    icon: Building2,
    iconColor: 'text-primary-500',
    iconBg: 'bg-primary-500/10',
    recommended: true,
    features: [
      { text: '5 объектов', included: true },
      { text: '5 пользователей', included: true },
      { text: '5 касс', included: true },
      { text: 'Полный учёт финансов', included: true },
      { text: 'Экспорт в Excel', included: true },
      { text: 'Аналитика', included: false },
      { text: 'API доступ', included: false },
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Бизнес',
    description: 'Для крупных компаний',
    price: 2490,
    priceLabel: '2 490 ₽',
    period: 'в месяц',
    icon: Rocket,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
    features: [
      { text: 'Безлимитные объекты', included: true },
      { text: 'Безлимитные пользователи', included: true },
      { text: 'Безлимитные кассы', included: true },
      { text: 'Полный учёт финансов', included: true },
      { text: 'Экспорт в Excel', included: true },
      { text: 'Продвинутая аналитика', included: true },
      { text: 'API доступ', included: true },
    ],
  },
];

// ============================================
// Page Component
// ============================================

export default function PlanPage() {
  const router = useRouter();
  const company = useCompany();
  const currentPlan = company?.plan || 'FREE';

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlan) return;

    // TODO: Интеграция с платёжной системой
    alert(`Переход на тариф ${planId}. Скоро будет доступна оплата!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Тарифы</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Current Plan Info */}
        <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white border-none shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Текущий тариф</p>
              <p className="text-xl font-bold text-white">
                {PLANS.find((p) => p.id === currentPlan)?.name}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        {/* Plans List */}
        <div className="space-y-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const Icon = plan.icon;

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden ${plan.recommended ? 'ring-2 ring-primary-500' : ''
                  }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 bg-primary-600 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                    Рекомендуем
                  </div>
                )}

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${plan.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${plan.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                        {isCurrentPlan && (
                          <span className="text-xs px-2 py-0.5 bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400 rounded-full">
                            Активен
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      {plan.priceLabel}
                    </span>
                    <span className="text-muted-foreground">/ {plan.period}</span>
                  </div>

                  {/* Features */}
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={`flex items-center gap-2 text-sm ${feature.included ? 'text-foreground/80' : 'text-muted-foreground'
                          }`}
                      >
                        <Check
                          className={`w-4 h-4 flex-shrink-0 ${feature.included ? 'text-success-600 dark:text-success-400' : 'text-muted-foreground opacity-30'
                            }`}
                        />
                        {feature.text}
                      </li>
                    ))}
                  </ul>

                  {/* Button */}
                  <div className="mt-4">
                    {isCurrentPlan ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Текущий тариф
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={plan.recommended ? 'primary' : 'secondary'}
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        {plan.price === 0 ? 'Выбрать' : 'Перейти'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <Card>
          <h3 className="font-semibold text-foreground mb-3">Частые вопросы</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-foreground">Как сменить тариф?</p>
              <p className="text-muted-foreground">
                Выберите подходящий тариф и нажмите «Перейти». Новый тариф активируется сразу после оплаты.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Что будет с данными при смене тарифа?</p>
              <p className="text-muted-foreground">
                Все ваши данные сохранятся. При переходе на меньший тариф создание новых объектов будет ограничено.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Можно ли вернуть деньги?</p>
              <p className="text-muted-foreground">
                Да, в течение 14 дней после оплаты вы можете запросить полный возврат.
              </p>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card className="bg-muted/50 border-border">
          <p className="text-sm text-muted-foreground text-center">
            Нужен индивидуальный тариф?{' '}
            <a href="mailto:support@stroyuchet.ru" className="text-primary-600 dark:text-primary-400 font-medium">
              Напишите нам
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
}
