// ============================================
// СтройУчёт - Plan Limits Configuration
// ============================================
// Все лимиты конфигурационные, не хардкод
// Можно переопределить на уровне Company
// ============================================

import { Plan } from '@prisma/client';

export interface PlanLimits {
  maxProjects: number;
  maxUsers: number;
  maxMoneySources: number;
  canExport: boolean;
  canAnalytics: boolean;
  canApi: boolean;
  retentionDays: number; // Хранение истории
}

// Дефолтные лимиты по тарифам
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxProjects: 1,
    maxUsers: 1,
    maxMoneySources: 1,
    canExport: false,
    canAnalytics: false,
    canApi: false,
    retentionDays: 90,
  },
  PRO: {
    maxProjects: 5,
    maxUsers: 5,
    maxMoneySources: 5,
    canExport: true,
    canAnalytics: false,
    canApi: false,
    retentionDays: 365,
  },
  BUSINESS: {
    maxProjects: Infinity,
    maxUsers: Infinity,
    maxMoneySources: Infinity,
    canExport: true,
    canAnalytics: true,
    canApi: true,
    retentionDays: Infinity,
  },
};

// Получить лимиты для компании (с учётом переопределений)
export function getCompanyLimits(
  plan: Plan,
  overrides?: { maxProjects?: number | null; maxUsers?: number | null; maxMoneySources?: number | null }
): PlanLimits {
  const defaults = PLAN_LIMITS[plan];
  
  return {
    ...defaults,
    maxProjects: overrides?.maxProjects ?? defaults.maxProjects,
    maxUsers: overrides?.maxUsers ?? defaults.maxUsers,
    maxMoneySources: overrides?.maxMoneySources ?? defaults.maxMoneySources,
  };
}

// Проверка лимита
export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
}

export function checkLimit(
  current: number,
  limit: number,
  entityName: string
): LimitCheckResult {
  const allowed = limit === Infinity || current < limit;
  
  return {
    allowed,
    current,
    limit,
    message: allowed 
      ? undefined 
      : `Лимит ${entityName} исчерпан: ${current}/${limit}. Обновите тариф.`,
  };
}
