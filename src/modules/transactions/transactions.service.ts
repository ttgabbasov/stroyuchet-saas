// ============================================
// СтройУчёт - Transactions Service v2
// ============================================
// Баланс проекта = INCOME - EXPENSE
// PAYOUT и INTERNAL не влияют на баланс проекта
// Контроль доступа через MoneySource
// ============================================

import { Prisma, ReceiptStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  TransactionResponse,
  ProjectBalance,
  ErrorCodes,
  AnalyticsSummary,
  CategorySummary,
  ProjectSummary,
  DailyHistory,
  CashFlowReport,
  CashFlowCategoryRow,
} from '../../types/api.types';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
} from './transactions.schema';
import {
  checkMoneySourceAccess,
  getAccessibleMoneySourceIds,
} from '../money-sources/money-sources.service';
import { Role } from '@prisma/client';
import { eventBus, EVENTS } from '../../lib/events.js';

// ============================================
// TYPES
// ============================================

export class TransactionError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export interface TransactionResponseV2 extends TransactionResponse {
  moneySource: { id: string; name: string; companyId: string };
  toMoneySource?: { id: string; name: string };
  payoutUser?: { id: string; name: string };
  project?: { id: string; name: string };
  receiptStatus: ReceiptStatus;
  receiptUrl?: string;
}

// ============================================
// BALANCE CALCULATIONS
// ============================================

/**
 * Вычисление баланса по объекту
 * Баланс проекта = INCOME - EXPENSE
 * PAYOUT и INTERNAL НЕ влияют на баланс проекта
 */
export async function calculateProjectBalance(
  projectId: string
): Promise<ProjectBalance> {
  const result = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      projectId,
      deletedAt: null,
      type: { in: ['INCOME', 'EXPENSE'] }, // Только эти типы влияют на баланс
    },
    _sum: {
      amountCents: true,
    },
  });

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  for (const row of result) {
    if (row.type === 'INCOME') {
      totalIncomeCents = row._sum.amountCents || 0;
    } else if (row.type === 'EXPENSE') {
      totalExpenseCents = row._sum.amountCents || 0;
    }
  }

  return {
    totalIncomeCents,
    totalExpenseCents,
    balanceCents: totalIncomeCents - totalExpenseCents,
  };
}

/**
 * Вычисление баланса по всей компании
 */
export async function calculateCompanyBalance(
  companyId: string
): Promise<ProjectBalance> {
  const result = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      project: { companyId },
      deletedAt: null,
      type: { in: ['INCOME', 'EXPENSE'] },
    },
    _sum: {
      amountCents: true,
    },
  });

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  for (const row of result) {
    if (row.type === 'INCOME') {
      totalIncomeCents = row._sum.amountCents || 0;
    } else if (row.type === 'EXPENSE') {
      totalExpenseCents = row._sum.amountCents || 0;
    }
  }

  return {
    totalIncomeCents,
    totalExpenseCents,
    balanceCents: totalIncomeCents - totalExpenseCents,
  };
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Создание транзакции
 */
export async function createTransaction(
  data: CreateTransactionInput,
  userId: string,
  companyId: string,
  userRole: Role
): Promise<TransactionResponseV2> {
  // Проверяем доступ к кассе (canSpend)
  const access = await checkMoneySourceAccess(data.moneySourceId, userId, userRole);

  if (!access.canSpend) {
    throw new TransactionError(ErrorCodes.FORBIDDEN, 'Нет прав на операции с этой кассой');
  }

  // Проверяем что касса принадлежит компании
  const moneySource = await prisma.moneySource.findFirst({
    where: { id: data.moneySourceId, companyId, isActive: true },
  });

  if (!moneySource) {
    throw new TransactionError(ErrorCodes.NOT_FOUND, 'Касса не найдена');
  }

  // Проверяем категорию и её совместимость с типом
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new TransactionError(ErrorCodes.NOT_FOUND, 'Категория не найдена');
  }

  if (!category.allowedTypes.includes(data.type)) {
    throw new TransactionError(
      ErrorCodes.INVALID_INPUT,
      `Категория "${category.name}" не поддерживает тип ${data.type}`
    );
  }

  // Проверяем проект если указан
  if ('projectId' in data && data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, companyId },
    });
    if (!project) {
      throw new TransactionError(ErrorCodes.NOT_FOUND, 'Проект не найден');
    }
  }

  // Дополнительные проверки по типу
  let toMoneySourceId: string | undefined;
  let payoutUserId: string | undefined;

  if (data.type === 'INTERNAL') {
    // Проверяем кассу-получателя
    const toAccess = await checkMoneySourceAccess(data.toMoneySourceId, userId, userRole);
    if (!toAccess.canView) {
      throw new TransactionError(ErrorCodes.FORBIDDEN, 'Нет доступа к кассе-получателю');
    }

    const toMoneySource = await prisma.moneySource.findFirst({
      where: { id: data.toMoneySourceId, companyId, isActive: true },
    });
    if (!toMoneySource) {
      throw new TransactionError(ErrorCodes.NOT_FOUND, 'Касса-получатель не найдена');
    }

    if (data.toMoneySourceId === data.moneySourceId) {
      throw new TransactionError(ErrorCodes.INVALID_INPUT, 'Нельзя перевести в ту же кассу');
    }

    toMoneySourceId = data.toMoneySourceId;
  }

  if (data.type === 'PAYOUT') {
    // Проверяем получателя выплаты
    const payoutUser = await prisma.user.findFirst({
      where: { id: data.payoutUserId, companyId },
    });
    if (!payoutUser) {
      throw new TransactionError(ErrorCodes.NOT_FOUND, 'Получатель выплаты не найден');
    }
    payoutUserId = data.payoutUserId;
  }

  // Создаём транзакцию
  const transaction = await prisma.transaction.create({
    data: {
      type: data.type,
      amountCents: Math.abs(data.amountCents),
      categoryId: data.categoryId,
      moneySourceId: data.moneySourceId,
      toMoneySourceId,
      payoutUserId,
      projectId: 'projectId' in data ? data.projectId : undefined,
      date: new Date(data.date),
      comment: data.comment,
      receiptStatus: data.receiptStatus || 'NO_RECEIPT',
      receiptUrl: data.receiptUrl,
      createdById: userId,
    },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
      moneySource: { select: { id: true, name: true } },
      toMoneySource: { select: { id: true, name: true } },
      payoutUser: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  const response = mapTransactionToResponseV2(transaction);

  // Генерируем события для уведомлений
  eventBus.emit(EVENTS.TRANSACTION.CREATED, response);

  if (transaction.type === 'ADVANCE') {
    eventBus.emit(EVENTS.ADVANCE.REFILLED, response);
  }

  return response;
}

/**
 * Получение транзакции по ID
 */
export async function getTransactionById(
  transactionId: string,
  userId: string,
  userRole: Role,
  companyId: string
): Promise<TransactionResponseV2> {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      moneySource: { companyId },
    },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
      moneySource: { select: { id: true, name: true } },
      toMoneySource: { select: { id: true, name: true } },
      payoutUser: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!transaction) {
    throw new TransactionError(ErrorCodes.NOT_FOUND, 'Транзакция не найдена');
  }

  // Проверяем доступ к кассе
  const access = await checkMoneySourceAccess(transaction.moneySourceId, userId, userRole);
  if (!access.canView) {
    throw new TransactionError(ErrorCodes.FORBIDDEN, 'Нет доступа к этой транзакции');
  }

  return mapTransactionToResponseV2(transaction);
}

/**
 * Обновление транзакции
 */
export async function updateTransaction(
  transactionId: string,
  _userId: string,
  userRole: Role,
  companyId: string,
  data: UpdateTransactionInput
): Promise<TransactionResponseV2> {
  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      moneySource: { companyId },
      deletedAt: null,
    },
  });

  if (!existing) {
    throw new TransactionError(ErrorCodes.NOT_FOUND, 'Транзакция не найдена');
  }

  // Only OWNER or the creator can edit
  if (userRole !== 'OWNER' && existing.createdById !== _userId) {
    throw new TransactionError(ErrorCodes.FORBIDDEN, 'У вас нет прав для редактирования этой транзакции');
  }

  // Проверяем категорию если меняется
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new TransactionError(ErrorCodes.NOT_FOUND, 'Категория не найдена');
    }
    if (!category.allowedTypes.includes(existing.type)) {
      throw new TransactionError(
        ErrorCodes.INVALID_INPUT,
        `Категория не поддерживает тип ${existing.type}`
      );
    }
  }

  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      amountCents: data.amountCents ? Math.abs(data.amountCents) : undefined,
      categoryId: data.categoryId,
      date: data.date ? new Date(data.date) : undefined,
      comment: data.comment,
      receiptStatus: data.receiptStatus,
      receiptUrl: data.receiptUrl,
    },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
      moneySource: { select: { id: true, name: true } },
      toMoneySource: { select: { id: true, name: true } },
      payoutUser: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  return mapTransactionToResponseV2(transaction);
}

/**
 * Получение списка транзакций с фильтрами
 */
export async function getTransactions(
  userId: string,
  userRole: Role,
  companyId: string,
  filters: ListTransactionsQuery
): Promise<{ transactions: TransactionResponseV2[]; total: number; hasMore: boolean }> {
  const { page, limit } = filters;
  const skip = (page - 1) * limit;

  // Получаем доступные кассы
  const accessibleMoneySourceIds = await getAccessibleMoneySourceIds(companyId, userId, userRole);

  const where: Prisma.TransactionWhereInput = {
    moneySourceId: { in: accessibleMoneySourceIds },
  };

  // По умолчанию скрываем удалённые
  if (!filters.includeDeleted) {
    where.deletedAt = null;
  }

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.moneySourceId) {
    // Дополнительно фильтруем по конкретной кассе (если есть доступ)
    if (accessibleMoneySourceIds.includes(filters.moneySourceId)) {
      where.moneySourceId = filters.moneySourceId;
    } else {
      // Нет доступа - вернём пустой результат
      return { transactions: [], total: 0, hasMore: false };
    }
  }
  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }
  if (filters.createdById) {
    where.createdById = filters.createdById;
  }
  if (filters.payoutUserId) {
    where.payoutUserId = filters.payoutUserId;
  }
  if (filters.receiptStatus) {
    where.receiptStatus = filters.receiptStatus;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      where.date.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.date.lte = new Date(filters.dateTo);
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        createdBy: { select: { id: true, name: true } },
        moneySource: { select: { id: true, name: true } },
        toMoneySource: { select: { id: true, name: true } },
        payoutUser: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions: transactions.map(mapTransactionToResponseV2),
    total,
    hasMore: skip + transactions.length < total,
  };
}

/**
 * Получение транзакций с нарастающим итогом по проекту
 */
export async function getTransactionsWithRunningBalance(
  projectId: string,
  _userId: string,
  _userRole: Role,
  companyId: string,
  options: { page?: number; limit?: number } = {}
): Promise<TransactionResponseV2[]> {
  const { page = 1, limit = 50 } = options;

  // Проверяем доступ к проекту
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new TransactionError(ErrorCodes.NOT_FOUND, 'Проект не найден');
  }

  // Получаем ВСЕ транзакции проекта для расчёта running balance
  // Только INCOME и EXPENSE влияют на баланс проекта
  const allTransactions = await prisma.transaction.findMany({
    where: {
      projectId,
      deletedAt: null,
    },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
      moneySource: { select: { id: true, name: true } },
      toMoneySource: { select: { id: true, name: true } },
      payoutUser: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  // Вычисляем нарастающий итог (только INCOME и EXPENSE)
  let runningBalance = 0;
  const withBalance = allTransactions.map((tx) => {
    if (tx.type === 'INCOME') {
      runningBalance += tx.amountCents;
    } else if (tx.type === 'EXPENSE') {
      runningBalance -= tx.amountCents;
    }
    // PAYOUT и INTERNAL не меняют баланс проекта

    return {
      ...tx,
      runningBalanceCents: runningBalance,
    };
  });

  // Возвращаем в обратном порядке (новые сверху) с пагинацией
  const reversed = withBalance.reverse();
  const paginated = reversed.slice((page - 1) * limit, page * limit);

  return paginated.map(mapTransactionToResponseV2);
}

/**
 * Мягкое удаление транзакции
 */
export async function softDeleteTransaction(
  transactionId: string,
  userId: string,
  userRole: Role,
  companyId: string
): Promise<void> {
  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      moneySource: { companyId },
      deletedAt: null,
    },
  });

  if (!existing) {
    throw new TransactionError(ErrorCodes.NOT_FOUND, 'Транзакция не найдена');
  }

  if (userRole !== 'OWNER' && existing.createdById !== userId) {
    throw new TransactionError(ErrorCodes.FORBIDDEN, 'У вас нет прав для удаления этой транзакции');
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      deletedAt: new Date(),
      deletedById: userId,
    },
  });
}

/**
 * Восстановление удалённой транзакции
 */
export async function restoreTransaction(
  transactionId: string,
  userRole: Role,
  companyId: string
): Promise<TransactionResponseV2> {
  if (userRole !== 'OWNER') {
    throw new TransactionError(ErrorCodes.FORBIDDEN, 'Только владелец может восстанавливать транзакции');
  }

  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      moneySource: { companyId },
      deletedAt: { not: null },
    },
  });

  if (!existing) {
    throw new TransactionError(ErrorCodes.NOT_FOUND, 'Удалённая транзакция не найдена');
  }

  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      deletedAt: null,
      deletedById: null,
    },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
      moneySource: { select: { id: true, name: true } },
      toMoneySource: { select: { id: true, name: true } },
      payoutUser: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  return mapTransactionToResponseV2(transaction);
}

// ============================================
// ANALYTICS
// ============================================

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  totalCents: number;
  count: number;
  percentage: number;
}

/**
 * Расходы по категориям
 */
export async function getExpensesByCategory(
  companyId: string,
  filters: { projectId?: string; dateFrom?: string; dateTo?: string } = {}
): Promise<CategoryBreakdown[]> {
  const where: Prisma.TransactionWhereInput = {
    moneySource: { companyId },
    type: 'EXPENSE', // Только реальные расходы проекта
    deletedAt: null,
  };

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  const result = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where,
    _sum: { amountCents: true },
    _count: { id: true },
  });

  const categoryIds = result.map((r) => r.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const totalExpense = result.reduce(
    (sum, r) => sum + (r._sum.amountCents || 0),
    0
  );

  return result
    .map((r) => {
      const cat = categoryMap.get(r.categoryId);
      const totalCents = r._sum.amountCents || 0;

      return {
        categoryId: r.categoryId,
        categoryName: cat?.name || 'Неизвестно',
        icon: cat?.icon || '📦',
        color: cat?.color || '#64748b',
        totalCents,
        count: r._count.id,
        percentage: totalExpense > 0 ? (totalCents / totalExpense) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents);
}

/**
 * Выплаты по сотрудникам
 */
export async function getPayoutsByUser(
  companyId: string,
  filters: { projectId?: string; dateFrom?: string; dateTo?: string } = {}
): Promise<{ userId: string; userName: string; totalCents: number; count: number }[]> {
  const where: Prisma.TransactionWhereInput = {
    moneySource: { companyId },
    type: 'PAYOUT',
    deletedAt: null,
    payoutUserId: { not: null },
  };

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  const result = await prisma.transaction.groupBy({
    by: ['payoutUserId'],
    where,
    _sum: { amountCents: true },
    _count: { id: true },
  });

  const userIds = result.map((r) => r.payoutUserId).filter((id): id is string => id !== null);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return result
    .filter((r) => r.payoutUserId)
    .map((r) => ({
      userId: r.payoutUserId!,
      userName: userMap.get(r.payoutUserId!) || 'Неизвестно',
      totalCents: r._sum.amountCents || 0,
      count: r._count.id,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

// ============================================
// MAPPER
// ============================================

type TransactionWithRelationsV2 = Prisma.TransactionGetPayload<{
  include: {
    category: true;
    createdBy: { select: { id: true; name: true } };
    moneySource: { select: { id: true; name: true } };
    toMoneySource: { select: { id: true; name: true } };
    payoutUser: { select: { id: true; name: true } };
    project: { select: { id: true; name: true } };
  };
}> & { runningBalanceCents?: number };

function mapTransactionToResponseV2(
  tx: TransactionWithRelationsV2
): TransactionResponseV2 {
  return {
    id: tx.id,
    type: tx.type,
    amountCents: tx.amountCents,
    category: {
      id: tx.category.id,
      name: tx.category.name,
      icon: tx.category.icon,
      color: tx.category.color,
      allowedTypes: tx.category.allowedTypes,
    },
    moneySource: {
      id: tx.moneySource.id,
      name: tx.moneySource.name,
      companyId: tx.moneySource.companyId,
    },
    toMoneySource: tx.toMoneySource || undefined,
    payoutUser: tx.payoutUser || undefined,
    project: tx.project || undefined,
    comment: tx.comment || undefined,
    receiptStatus: tx.receiptStatus,
    receiptUrl: tx.receiptUrl || undefined,
    date: tx.date.toISOString().split('T')[0],
    createdBy: tx.createdBy,
    runningBalanceCents: tx.runningBalanceCents,
    createdAt: tx.createdAt.toISOString(),
  };
}

/**
 * Сводная аналитика по компании
 */
export async function getAnalyticsSummary(
  companyId: string,
  filters: { projectId?: string; dateFrom?: string; dateTo?: string } = {}
): Promise<AnalyticsSummary> {
  const where: Prisma.TransactionWhereInput = {
    moneySource: { companyId },
    deletedAt: null,
  };

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  // 1. Получаем все транзакции для подсчета
  const totals = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _sum: { amountCents: true },
  });

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  totals.forEach((t) => {
    if (t.type === 'INCOME') totalIncomeCents += t._sum.amountCents || 0;
    if (t.type === 'EXPENSE') totalExpenseCents += t._sum.amountCents || 0;
  });

  const profitCents = totalIncomeCents - totalExpenseCents;
  const profitMargin = totalIncomeCents > 0 ? (profitCents / totalIncomeCents) * 100 : 0;

  // 2. Расходы по категориям
  const expensesByCategory = await getExpensesByCategory(companyId, filters);
  const byCategory: CategorySummary[] = expensesByCategory.map((e) => ({
    categoryId: e.categoryId,
    categoryName: e.categoryName,
    totalCents: e.totalCents,
    percentage: e.percentage,
    count: e.count
  }));

  // 3. Доходы и расходы по проектам (placeholder)
  const byProject: ProjectSummary[] = [];

  // 4. История по дням
  const rawHistory = await prisma.transaction.findMany({
    where: {
      ...where,
      type: { in: ['INCOME', 'EXPENSE'] }
    },
    select: {
      date: true,
      type: true,
      amountCents: true,
    },
    orderBy: { date: 'asc' }
  });

  const historyMap = new Map<string, { income: number; expense: number }>();

  rawHistory.forEach((tx) => {
    const dateKey = tx.date.toISOString().split('T')[0];
    if (!historyMap.has(dateKey)) {
      historyMap.set(dateKey, { income: 0, expense: 0 });
    }
    const day = historyMap.get(dateKey)!;
    if (tx.type === 'INCOME') day.income += tx.amountCents;
    if (tx.type === 'EXPENSE') day.expense += tx.amountCents;
  });

  const history: DailyHistory[] = Array.from(historyMap.entries()).map(([date, val]) => ({
    date,
    incomeCents: val.income,
    expenseCents: val.expense,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: {
      from: filters.dateFrom || '',
      to: filters.dateTo || '',
    },
    totalIncomeCents,
    totalExpenseCents,
    profitCents,
    profitMargin,
    byCategory,
    byProject,
    byUser: [],
    history,
  };
}

/**
 * Отчет ДДС (Cash Flow)
 */
export async function getCashFlowReport(
  companyId: string,
  filters: { projectId?: string; dateFrom?: string; dateTo?: string } = {}
): Promise<CashFlowReport> {
  const where: Prisma.TransactionWhereInput = {
    moneySource: { companyId },
    deletedAt: null,
    type: { in: ['INCOME', 'EXPENSE'] },
  };

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  // 1. Fetch raw transactions
  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      date: true,
      amountCents: true,
      type: true,
      category: {
        select: { id: true, name: true }
      }
    },
    orderBy: { date: 'asc' }
  });

  // 2. Determine columns (months)
  const monthSet = new Set<string>();
  transactions.forEach(tx => {
    monthSet.add(tx.date.toISOString().slice(0, 7)); // "YYYY-MM"
  });

  // Also ensure filter range is covered if transactions are sparse
  // (Simplified for now: just use transaction months)
  const columns = Array.from(monthSet).sort();

  // 3. Aggregate data
  // Structure: categoryId -> { name, type, values: { "YYYY-MM": amount } }
  const categoryMap = new Map<string, {
    name: string;
    type: string;
    values: Record<string, number>;
  }>();

  // Totals
  const incomeTotals: Record<string, number> = {};
  const expenseTotals: Record<string, number> = {};
  const balanceTotals: Record<string, number> = {};

  columns.forEach(col => {
    incomeTotals[col] = 0;
    expenseTotals[col] = 0;
    balanceTotals[col] = 0;
  });

  transactions.forEach(tx => {
    const month = tx.date.toISOString().slice(0, 7);
    const catId = tx.category.id;

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        name: tx.category.name,
        type: tx.type,
        values: {}
      });
      // Initialize all columns for this category
      columns.forEach(col => {
        categoryMap.get(catId)!.values[col] = 0;
      });
    }

    const entry = categoryMap.get(catId)!;
    entry.values[month] += tx.amountCents;

    // Update Totals
    if (tx.type === 'INCOME') {
      incomeTotals[month] += tx.amountCents;
    } else {
      expenseTotals[month] += tx.amountCents;
    }
  });

  // Calculate Balance per month
  columns.forEach(col => {
    balanceTotals[col] = incomeTotals[col] - expenseTotals[col];
  });

  // 4. Format Output
  const incomeRows: CashFlowCategoryRow[] = [];
  const expenseRows: CashFlowCategoryRow[] = [];

  categoryMap.forEach((data, id) => {
    const total = Object.values(data.values).reduce((sum, val) => sum + val, 0);
    const row: CashFlowCategoryRow = {
      categoryId: id,
      categoryName: data.name,
      values: data.values,
      total,
    };

    if (data.type === 'INCOME') incomeRows.push(row);
    else expenseRows.push(row);
  });

  // Sort rows by total amount desc
  incomeRows.sort((a, b) => b.total - a.total);
  expenseRows.sort((a, b) => b.total - a.total);

  return {
    period: {
      from: filters.dateFrom || columns[0] || '',
      to: filters.dateTo || columns[columns.length - 1] || '',
    },
    columns,
    categories: {
      income: incomeRows,
      expense: expenseRows,
    },
    totals: {
      income: incomeTotals,
      expense: expenseTotals,
      balance: balanceTotals,
      cumulativeBalance: {}, // Not implemented yet
    }
  };
}
