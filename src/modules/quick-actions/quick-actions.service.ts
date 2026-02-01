// ============================================
// Quick Actions Service
// ============================================
// Быстрые операции и автоматизация
// ============================================

import { prisma } from '../../lib/prisma';
import { Role, TransactionType } from '@prisma/client';
import { ErrorCodes } from '../../types/api.types';

export class QuickActionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'QuickActionError';
  }
}

// ============================================
// QUICK ACTION TEMPLATES
// ============================================

export interface QuickActionTemplate {
  id: string;
  label: string;
  icon: string;
  color: string;
  type: TransactionType;
  categoryId?: string;
  categoryName?: string;
  description: string;
}

/**
 * Получить шаблоны быстрых действий для пользователя
 */
export async function getQuickActionTemplates(
  _userId: string,
  companyId: string,
  userRole: Role
): Promise<QuickActionTemplate[]> {
  const templates: QuickActionTemplate[] = [];

  // Получаем категории
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { isSystem: true },
        { companyId },
      ],
    },
  });

  const findCategory = (name: string) => categories.find(c =>
    c.name.toLowerCase().includes(name.toLowerCase())
  );

  // Шаблоны для прораба
  if (userRole === 'FOREMAN') {
    const materialsCategory = findCategory('материал') || findCategory('стройматериал');
    const deliveryCategory = findCategory('доставка');
    const toolsCategory = findCategory('инструмент');

    if (materialsCategory) {
      templates.push({
        id: 'quick_materials',
        label: 'Материалы',
        icon: '🧱',
        color: '#F59E0B',
        type: 'EXPENSE',
        categoryId: materialsCategory.id,
        categoryName: materialsCategory.name,
        description: 'Купил стройматериалы',
      });
    }

    if (deliveryCategory) {
      templates.push({
        id: 'quick_delivery',
        label: 'Доставка',
        icon: '🚚',
        color: '#3B82F6',
        type: 'EXPENSE',
        categoryId: deliveryCategory.id,
        categoryName: deliveryCategory.name,
        description: 'Оплатил доставку',
      });
    }

    if (toolsCategory) {
      templates.push({
        id: 'quick_tools',
        label: 'Инструмент',
        icon: '🔧',
        color: '#6B7280',
        type: 'EXPENSE',
        categoryId: toolsCategory.id,
        categoryName: toolsCategory.name,
        description: 'Купил инструменты',
      });
    }
  }

  // Шаблоны для Owner/Accountant
  if (userRole === 'OWNER' || userRole === 'ACCOUNTANT') {
    const incomeCategory = findCategory('оплата') || findCategory('заказчик');
    const payoutCategory = findCategory('зарплата') || findCategory('работ');

    if (incomeCategory) {
      templates.push({
        id: 'quick_income',
        label: 'От заказчика',
        icon: '💰',
        color: '#10B981',
        type: 'INCOME',
        categoryId: incomeCategory.id,
        categoryName: incomeCategory.name,
        description: 'Получил оплату от заказчика',
      });
    }

    if (payoutCategory) {
      templates.push({
        id: 'quick_payout',
        label: 'Оплата работы',
        icon: '👷',
        color: '#8B5CF6',
        type: 'PAYOUT',
        categoryId: payoutCategory.id,
        categoryName: payoutCategory.name,
        description: 'Выплатил за работу',
      });
    }

    templates.push({
      id: 'quick_advance',
      label: 'Подотчёт',
      icon: '💼',
      color: '#F97316',
      type: 'ADVANCE',
      description: 'Выдать подотчёт сотруднику',
    });
  }

  return templates;
}

// ============================================
// RETURN ADVANCE BALANCE
// ============================================

export interface ReturnAdvanceResult {
  transaction: {
    id: string;
    amountCents: number;
  };
  fromMoneySource: { id: string; name: string };
  toMoneySource: { id: string; name: string };
  remainingBalance: number;
}

/**
 * Вернуть остаток подотчёта
 */
export async function returnAdvanceBalance(
  userId: string,
  companyId: string,
  _userRole: Role,
  toMoneySourceId: string,  // Куда вернуть (основная касса)
  amountCents?: number       // Сумма (если не указана — весь остаток)
): Promise<ReturnAdvanceResult> {

  // 1. Находим подотчётную кассу пользователя
  const advanceSource = await prisma.moneySource.findFirst({
    where: {
      ownerId: userId,
      companyId,
      isAdvance: true,
      isActive: true,
    },
  });

  if (!advanceSource) {
    throw new QuickActionError(ErrorCodes.NOT_FOUND, 'У вас нет подотчётной кассы');
  }

  // 2. Считаем баланс подотчётной кассы
  const income = await prisma.transaction.aggregate({
    where: { toMoneySourceId: advanceSource.id, deletedAt: null },
    _sum: { amountCents: true },
  });

  const expense = await prisma.transaction.aggregate({
    where: {
      moneySourceId: advanceSource.id,
      type: { in: ['EXPENSE', 'PAYOUT', 'INTERNAL'] },
      deletedAt: null,
    },
    _sum: { amountCents: true },
  });

  const currentBalance = (income._sum.amountCents || 0) - (expense._sum.amountCents || 0);

  if (currentBalance <= 0) {
    throw new QuickActionError(ErrorCodes.INVALID_INPUT, 'На подотчёте нет денег для возврата');
  }

  // 3. Определяем сумму возврата
  const returnAmount = amountCents
    ? Math.min(amountCents, currentBalance)
    : currentBalance;

  if (returnAmount <= 0) {
    throw new QuickActionError(ErrorCodes.INVALID_INPUT, 'Некорректная сумма возврата');
  }

  // 4. Проверяем кассу-получатель
  const toMoneySource = await prisma.moneySource.findFirst({
    where: { id: toMoneySourceId, companyId, isActive: true },
  });

  if (!toMoneySource) {
    throw new QuickActionError(ErrorCodes.NOT_FOUND, 'Касса для возврата не найдена');
  }

  // 5. Ищем или создаём категорию "Возврат подотчёта"
  let returnCategory = await prisma.category.findFirst({
    where: {
      name: { contains: 'Возврат' },
      allowedTypes: { has: 'INTERNAL' },
      isSystem: true,
    },
  });

  if (!returnCategory) {
    returnCategory = await prisma.category.create({
      data: {
        id: 'return_advance_category',
        name: 'Возврат подотчёта',
        icon: '↩️',
        color: '#6B7280',
        allowedTypes: ['INTERNAL'],
        isSystem: true,
      },
    });
  }

  // 6. Создаём транзакцию перевода
  const transaction = await prisma.transaction.create({
    data: {
      type: 'INTERNAL',
      amountCents: returnAmount,
      categoryId: returnCategory.id,
      moneySourceId: advanceSource.id,
      toMoneySourceId: toMoneySource.id,
      date: new Date(),
      comment: 'Возврат остатка подотчёта',
      receiptStatus: 'NO_RECEIPT',
      createdById: userId,
    },
  });

  return {
    transaction: {
      id: transaction.id,
      amountCents: transaction.amountCents,
    },
    fromMoneySource: { id: advanceSource.id, name: advanceSource.name },
    toMoneySource: { id: toMoneySource.id, name: toMoneySource.name },
    remainingBalance: currentBalance - returnAmount,
  };
}

// ============================================
// AUTO-CLOSE PROJECT
// ============================================

export interface CloseProjectResult {
  projectId: string;
  projectName: string;
  previousStatus: string;
  newStatus: string;
}

/**
 * Закрыть объект (перевести в статус COMPLETED)
 */
export async function closeProject(
  projectId: string,
  _userId: string,
  companyId: string,
  userRole: Role
): Promise<CloseProjectResult> {

  // Только Owner и Accountant могут закрывать
  if (userRole !== 'OWNER' && userRole !== 'ACCOUNTANT') {
    throw new QuickActionError(ErrorCodes.FORBIDDEN, 'Нет прав на закрытие объекта');
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new QuickActionError(ErrorCodes.NOT_FOUND, 'Объект не найден');
  }

  if (project.status !== 'ACTIVE') {
    throw new QuickActionError(ErrorCodes.INVALID_INPUT, 'Объект уже не активен');
  }

  // Обновляем статус
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'COMPLETED' },
  });

  return {
    projectId: project.id,
    projectName: project.name,
    previousStatus: project.status,
    newStatus: 'COMPLETED',
  };
}

/**
 * Получить сводку для закрытия объекта
 */
export async function getProjectCloseSummary(
  projectId: string,
  companyId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new QuickActionError(ErrorCodes.NOT_FOUND, 'Объект не найден');
  }

  // Баланс
  const result = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      projectId,
      type: { in: ['INCOME', 'EXPENSE'] },
      deletedAt: null,
    },
    _sum: { amountCents: true },
  });

  let income = 0, expense = 0;
  for (const r of result) {
    if (r.type === 'INCOME') income = r._sum.amountCents || 0;
    if (r.type === 'EXPENSE') expense = r._sum.amountCents || 0;
  }

  // Последняя транзакция
  const lastTx = await prisma.transaction.findFirst({
    where: { projectId, deletedAt: null },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  // Количество транзакций
  const txCount = await prisma.transaction.count({
    where: { projectId, deletedAt: null },
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      budgetCents: project.budgetCents,
    },
    summary: {
      incomeCents: income,
      expenseCents: expense,
      balanceCents: income - expense,
      transactionCount: txCount,
      lastTransactionDate: lastTx?.date || null,
    },
    canClose: project.status === 'ACTIVE',
  };
}
