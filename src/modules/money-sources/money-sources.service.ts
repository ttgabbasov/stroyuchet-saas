// ============================================
// MoneySource Service (Кассы)
// ============================================
// Контроль доступа: owner + sharedWith
// ============================================

import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ErrorCodes } from '../../types/api.types';
import { checkLimit } from '../../config/plan-limits';

// ============================================
// TYPES
// ============================================

export class MoneySourceError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'MoneySourceError';
  }
}

export interface MoneySourceResponse {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  isCompanyMain: boolean;
  isActive: boolean;
  balanceCents: number;
  sharedWith: { userId: string; userName: string; canView: boolean; canSpend: boolean }[];
  createdAt: string;
}

export interface CreateMoneySourceInput {
  name: string;
  description?: string;
  isCompanyMain?: boolean;
}

export interface ShareMoneySourceInput {
  userId: string;
  canView?: boolean;
  canSpend?: boolean;
}

// ============================================
// ACCESS CHECK
// ============================================

/**
 * Проверка доступа пользователя к кассе
 * Returns: { canView, canSpend }
 */
export async function checkMoneySourceAccess(
  moneySourceId: string,
  userId: string,
  userRole: Role
): Promise<{ canView: boolean; canSpend: boolean }> {
  const moneySource = await prisma.moneySource.findUnique({
    where: { id: moneySourceId },
    include: {
      sharedWith: {
        where: { userId },
      },
    },
  });

  if (!moneySource) {
    return { canView: false, canSpend: false };
  }

  // Owner компании видит и может тратить из всех касс
  if (userRole === 'OWNER') {
    return { canView: true, canSpend: true };
  }

  // Accountant видит все, но не может тратить
  if (userRole === 'ACCOUNTANT') {
    return { canView: true, canSpend: false };
  }

  // Владелец кассы
  if (moneySource.ownerId === userId) {
    return { canView: true, canSpend: true };
  }

  // Проверяем sharedWith
  const access = moneySource.sharedWith[0];
  if (access) {
    return { canView: access.canView, canSpend: access.canSpend };
  }

  // Главная касса компании видна всем (но тратить нельзя без прав)
  if (moneySource.isCompanyMain) {
    return { canView: true, canSpend: false };
  }

  return { canView: false, canSpend: false };
}

/**
 * Получение списка ID касс, доступных пользователю
 */
export async function getAccessibleMoneySourceIds(
  companyId: string,
  userId: string,
  userRole: Role
): Promise<string[]> {
  // Owner и Accountant видят все кассы компании
  if (userRole === 'OWNER' || userRole === 'ACCOUNTANT') {
    const sources = await prisma.moneySource.findMany({
      where: { companyId, isActive: true },
      select: { id: true },
    });
    return sources.map((s) => s.id);
  }

  // Остальные: свои + sharedWith + главная касса
  const sources = await prisma.moneySource.findMany({
    where: {
      companyId,
      isActive: true,
      OR: [
        { ownerId: userId },
        { sharedWith: { some: { userId, canView: true } } },
        { isCompanyMain: true },
      ],
    },
    select: { id: true },
  });

  return sources.map((s) => s.id);
}

// ============================================
// CRUD
// ============================================

/**
 * Создание кассы
 */
export async function createMoneySource(
  companyId: string,
  ownerId: string,
  input: CreateMoneySourceInput
): Promise<MoneySourceResponse> {
  // Проверяем лимит касс
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, maxMoneySources: true },
  });

  if (!company) {
    throw new MoneySourceError(ErrorCodes.NOT_FOUND, 'Компания не найдена');
  }

  // Note: limits are checked below using maxMoneySources from company
  const currentCount = await prisma.moneySource.count({ where: { companyId } });

  // Добавляем maxMoneySources в PlanLimits если его нет
  const maxMoneySources = company.maxMoneySources ?? (company.plan === 'FREE' ? 1 : company.plan === 'PRO' ? 5 : Infinity);

  const limitCheck = checkLimit(currentCount, maxMoneySources, 'касс');
  if (!limitCheck.allowed) {
    throw new MoneySourceError(ErrorCodes.PLAN_LIMIT_EXCEEDED, limitCheck.message!);
  }

  // Если это главная касса, убираем флаг с других
  if (input.isCompanyMain) {
    await prisma.moneySource.updateMany({
      where: { companyId, isCompanyMain: true },
      data: { isCompanyMain: false },
    });
  }

  const moneySource = await prisma.moneySource.create({
    data: {
      name: input.name,
      description: input.description,
      ownerId,
      companyId,
      isCompanyMain: input.isCompanyMain ?? false,
    },
    include: {
      owner: { select: { id: true, name: true } },
      sharedWith: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return mapMoneySourceToResponse(moneySource, 0);
}

/**
 * Список касс (с учётом доступа)
 */
export async function listMoneySources(
  companyId: string,
  userId: string,
  userRole: Role
): Promise<MoneySourceResponse[]> {
  const accessibleIds = await getAccessibleMoneySourceIds(companyId, userId, userRole);

  const moneySources = await prisma.moneySource.findMany({
    where: {
      id: { in: accessibleIds },
      isActive: true,
    },
    include: {
      owner: { select: { id: true, name: true } },
      sharedWith: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ isCompanyMain: 'desc' }, { name: 'asc' }],
  });

  // Вычисляем балансы для всех касс
  const results = await Promise.all(
    moneySources.map(async (ms) => {
      const balance = await calculateMoneySourceBalance(ms.id);
      return mapMoneySourceToResponse(ms, balance);
    })
  );

  return results;
}

/**
 * Получение кассы по ID
 */
export async function getMoneySource(
  moneySourceId: string,
  userId: string,
  userRole: Role
): Promise<MoneySourceResponse> {
  const access = await checkMoneySourceAccess(moneySourceId, userId, userRole);

  if (!access.canView) {
    throw new MoneySourceError(ErrorCodes.FORBIDDEN, 'Нет доступа к этой кассе');
  }

  const moneySource = await prisma.moneySource.findUnique({
    where: { id: moneySourceId },
    include: {
      owner: { select: { id: true, name: true } },
      sharedWith: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!moneySource) {
    throw new MoneySourceError(ErrorCodes.NOT_FOUND, 'Касса не найдена');
  }

  const balance = await calculateMoneySourceBalance(moneySourceId);
  return mapMoneySourceToResponse(moneySource, balance);
}

/**
 * Обновление кассы
 */
export async function updateMoneySource(
  moneySourceId: string,
  companyId: string,
  input: { name?: string; description?: string; isCompanyMain?: boolean }
): Promise<MoneySourceResponse> {
  const existing = await prisma.moneySource.findFirst({
    where: { id: moneySourceId, companyId },
  });

  if (!existing) {
    throw new MoneySourceError(ErrorCodes.NOT_FOUND, 'Касса не найдена');
  }

  // Если делаем главной, убираем флаг с других
  if (input.isCompanyMain && !existing.isCompanyMain) {
    await prisma.moneySource.updateMany({
      where: { companyId, isCompanyMain: true },
      data: { isCompanyMain: false },
    });
  }

  const moneySource = await prisma.moneySource.update({
    where: { id: moneySourceId },
    data: {
      name: input.name,
      description: input.description,
      isCompanyMain: input.isCompanyMain,
    },
    include: {
      owner: { select: { id: true, name: true } },
      sharedWith: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  const balance = await calculateMoneySourceBalance(moneySourceId);
  return mapMoneySourceToResponse(moneySource, balance);
}

/**
 * Деактивация кассы (soft delete)
 */
export async function deactivateMoneySource(
  moneySourceId: string,
  companyId: string
): Promise<void> {
  const existing = await prisma.moneySource.findFirst({
    where: { id: moneySourceId, companyId },
  });

  if (!existing) {
    throw new MoneySourceError(ErrorCodes.NOT_FOUND, 'Касса не найдена');
  }

  // Нельзя деактивировать главную кассу
  if (existing.isCompanyMain) {
    throw new MoneySourceError(ErrorCodes.FORBIDDEN, 'Нельзя деактивировать главную кассу');
  }

  await prisma.moneySource.update({
    where: { id: moneySourceId },
    data: { isActive: false },
  });
}

// ============================================
// SHARING
// ============================================

/**
 * Добавление/обновление доступа к кассе
 */
export async function shareMoneySource(
  moneySourceId: string,
  companyId: string,
  input: ShareMoneySourceInput
): Promise<void> {
  // Проверяем что касса существует
  const moneySource = await prisma.moneySource.findFirst({
    where: { id: moneySourceId, companyId },
  });

  if (!moneySource) {
    throw new MoneySourceError(ErrorCodes.NOT_FOUND, 'Касса не найдена');
  }

  // Проверяем что пользователь существует в той же компании
  const user = await prisma.user.findFirst({
    where: { id: input.userId, companyId },
  });

  if (!user) {
    throw new MoneySourceError(ErrorCodes.NOT_FOUND, 'Пользователь не найден');
  }

  // Нельзя шарить владельцу
  if (moneySource.ownerId === input.userId) {
    throw new MoneySourceError(ErrorCodes.INVALID_INPUT, 'Владельцу не нужен дополнительный доступ');
  }

  await prisma.moneySourceAccess.upsert({
    where: {
      moneySourceId_userId: {
        moneySourceId,
        userId: input.userId,
      },
    },
    create: {
      moneySourceId,
      userId: input.userId,
      canView: input.canView ?? true,
      canSpend: input.canSpend ?? false,
    },
    update: {
      canView: input.canView,
      canSpend: input.canSpend,
    },
  });
}

/**
 * Удаление доступа к кассе
 */
export async function unshareMoneySource(
  moneySourceId: string,
  userId: string,
  companyId: string
): Promise<void> {
  const moneySource = await prisma.moneySource.findFirst({
    where: { id: moneySourceId, companyId },
  });

  if (!moneySource) {
    throw new MoneySourceError(ErrorCodes.NOT_FOUND, 'Касса не найдена');
  }

  await prisma.moneySourceAccess.deleteMany({
    where: { moneySourceId, userId },
  });
}

// ============================================
// BALANCE CALCULATION
// ============================================

/**
 * Вычисление баланса кассы
 * Баланс кассы = входящие - исходящие (все типы транзакций)
 */
export async function calculateMoneySourceBalance(
  moneySourceId: string
): Promise<number> {
  // Входящие: INCOME в эту кассу + INTERNAL в эту кассу
  const incoming = await prisma.transaction.aggregate({
    where: {
      deletedAt: null,
      OR: [
        { moneySourceId, type: 'INCOME' },
        { toMoneySourceId: moneySourceId, type: 'INTERNAL' },
      ],
    },
    _sum: { amountCents: true },
  });

  // Исходящие: EXPENSE, PAYOUT, INTERNAL из этой кассы
  const outgoing = await prisma.transaction.aggregate({
    where: {
      moneySourceId,
      deletedAt: null,
      type: { in: ['EXPENSE', 'PAYOUT', 'INTERNAL'] },
    },
    _sum: { amountCents: true },
  });

  const incomingTotal = incoming._sum.amountCents || 0;
  const outgoingTotal = outgoing._sum.amountCents || 0;

  return incomingTotal - outgoingTotal;
}

// ============================================
// MAPPER
// ============================================

type MoneySourceWithRelations = Prisma.MoneySourceGetPayload<{
  include: {
    owner: { select: { id: true; name: true } };
    sharedWith: { include: { user: { select: { id: true; name: true } } } };
  };
}>;

function mapMoneySourceToResponse(
  ms: MoneySourceWithRelations,
  balanceCents: number
): MoneySourceResponse {
  return {
    id: ms.id,
    name: ms.name,
    description: ms.description || undefined,
    ownerId: ms.ownerId,
    ownerName: ms.owner.name,
    isCompanyMain: ms.isCompanyMain,
    isActive: ms.isActive,
    balanceCents,
    sharedWith: ms.sharedWith.map((sw) => ({
      userId: sw.userId,
      userName: sw.user.name,
      canView: sw.canView,
      canSpend: sw.canSpend,
    })),
    createdAt: ms.createdAt.toISOString(),
  };
}
