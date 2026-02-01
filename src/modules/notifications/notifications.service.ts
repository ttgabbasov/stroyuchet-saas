// ============================================
// Notifications Service
// ============================================
// Система уведомлений для СтройУчёт
// ============================================

import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export enum NotificationType {
  LOW_BALANCE = 'LOW_BALANCE',           // Мало денег на подотчёте
  LARGE_EXPENSE = 'LARGE_EXPENSE',       // Крупный расход (требует внимания)
  MISSING_RECEIPT = 'MISSING_RECEIPT',   // Нет чека 3+ дня
  PROJECT_NEGATIVE = 'PROJECT_NEGATIVE', // Объект в минусе
  PROJECT_IDLE = 'PROJECT_IDLE',         // Объект без операций 30 дней
  ADVANCE_RETURN = 'ADVANCE_RETURN',     // Напоминание вернуть остаток
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  entityType?: 'project' | 'moneySource' | 'transaction';
  entityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: Date;
  isRead: boolean;
}

// ============================================
// THRESHOLDS (Пороговые значения)
// ============================================

const THRESHOLDS = {
  LOW_BALANCE_CENTS: 1000000,      // 10 000 ₽
  LARGE_EXPENSE_CENTS: 5000000,    // 50 000 ₽
  MISSING_RECEIPT_DAYS: 3,
  IDLE_PROJECT_DAYS: 30,
};

// ============================================
// CHECK FUNCTIONS
// ============================================

/**
 * Проверка низкого баланса подотчётных касс
 */
export async function checkLowBalanceAlerts(companyId: string): Promise<Notification[]> {
  const notifications: Notification[] = [];

  // Получаем все подотчётные кассы
  const advanceSources = await prisma.moneySource.findMany({
    where: { companyId, isAdvance: true, isActive: true },
    include: { owner: { select: { id: true, name: true } } },
  });

  for (const source of advanceSources) {
    // Считаем баланс
    const income = await prisma.transaction.aggregate({
      where: {
        toMoneySourceId: source.id,
        deletedAt: null,
      },
      _sum: { amountCents: true },
    });

    const expense = await prisma.transaction.aggregate({
      where: {
        moneySourceId: source.id,
        type: { in: ['EXPENSE', 'PAYOUT', 'INTERNAL'] },
        deletedAt: null,
      },
      _sum: { amountCents: true },
    });

    const balance = (income._sum.amountCents || 0) - (expense._sum.amountCents || 0);

    if (balance > 0 && balance < THRESHOLDS.LOW_BALANCE_CENTS) {
      notifications.push({
        id: `low_balance_${source.id}`,
        type: NotificationType.LOW_BALANCE,
        title: 'Заканчивается подотчёт',
        message: `У ${source.owner.name} осталось ${(balance / 100).toLocaleString('ru-RU')} ₽`,
        severity: 'warning',
        entityType: 'moneySource',
        entityId: source.id,
        actionUrl: `/advance/new?recipientId=${source.owner.id}`,
        actionLabel: 'Пополнить',
        createdAt: new Date(),
        isRead: false,
      });
    }
  }

  return notifications;
}

/**
 * Проверка крупных расходов (для Owner)
 */
export async function checkLargeExpenses(companyId: string): Promise<Notification[]> {
  const notifications: Notification[] = [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const largeExpenses = await prisma.transaction.findMany({
    where: {
      moneySource: { companyId },
      type: 'EXPENSE',
      amountCents: { gte: THRESHOLDS.LARGE_EXPENSE_CENTS },
      createdAt: { gte: yesterday },
      deletedAt: null,
    },
    include: {
      createdBy: { select: { name: true } },
      project: { select: { name: true } },
      category: { select: { name: true, icon: true } },
    },
  });

  for (const tx of largeExpenses) {
    notifications.push({
      id: `large_expense_${tx.id}`,
      type: NotificationType.LARGE_EXPENSE,
      title: 'Крупный расход',
      message: `${tx.createdBy.name}: ${(tx.amountCents / 100).toLocaleString('ru-RU')} ₽ на ${tx.category.name}`,
      severity: 'info',
      entityType: 'transaction',
      entityId: tx.id,
      actionUrl: `/transactions/${tx.id}`,
      actionLabel: 'Посмотреть',
      createdAt: tx.createdAt,
      isRead: false,
    });
  }

  return notifications;
}

/**
 * Проверка отсутствующих чеков
 */
export async function checkMissingReceipts(companyId: string): Promise<Notification[]> {
  const notifications: Notification[] = [];

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - THRESHOLDS.MISSING_RECEIPT_DAYS);

  const missingReceipts = await prisma.transaction.findMany({
    where: {
      moneySource: { companyId },
      type: 'EXPENSE',
      receiptStatus: 'PENDING',
      date: { lte: threeDaysAgo },
      deletedAt: null,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      category: { select: { name: true } },
    },
    take: 10, // Лимит
  });

  if (missingReceipts.length > 0) {
    notifications.push({
      id: `missing_receipts_${Date.now()}`,
      type: NotificationType.MISSING_RECEIPT,
      title: 'Ожидаются чеки',
      message: `${missingReceipts.length} операций без чеков более ${THRESHOLDS.MISSING_RECEIPT_DAYS} дней`,
      severity: 'warning',
      actionUrl: '/transactions?receiptStatus=PENDING',
      actionLabel: 'Показать',
      createdAt: new Date(),
      isRead: false,
    });
  }

  return notifications;
}

/**
 * Проверка объектов в минусе
 */
export async function checkNegativeProjects(companyId: string): Promise<Notification[]> {
  const notifications: Notification[] = [];

  const projects = await prisma.project.findMany({
    where: { companyId, status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  for (const project of projects) {
    const result = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        projectId: project.id,
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

    const balance = income - expense;

    if (balance < 0) {
      notifications.push({
        id: `negative_project_${project.id}`,
        type: NotificationType.PROJECT_NEGATIVE,
        title: 'Объект в минусе',
        message: `${project.name}: ${(balance / 100).toLocaleString('ru-RU')} ₽`,
        severity: 'danger',
        entityType: 'project',
        entityId: project.id,
        actionUrl: `/projects/${project.id}`,
        actionLabel: 'Открыть',
        createdAt: new Date(),
        isRead: false,
      });
    }
  }

  return notifications;
}

/**
 * Проверка неактивных объектов (кандидаты на закрытие)
 */
export async function checkIdleProjects(companyId: string): Promise<Notification[]> {
  const notifications: Notification[] = [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - THRESHOLDS.IDLE_PROJECT_DAYS);

  const activeProjects = await prisma.project.findMany({
    where: { companyId, status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  for (const project of activeProjects) {
    // Проверяем последнюю транзакцию
    const lastTx = await prisma.transaction.findFirst({
      where: { projectId: project.id, deletedAt: null },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    // Проверяем баланс
    const result = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        projectId: project.id,
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
    const balance = income - expense;

    // Если нет операций 30 дней и баланс около нуля — предлагаем закрыть
    const isIdle = !lastTx || lastTx.date < thirtyDaysAgo;
    const isBalanceZero = Math.abs(balance) < 100; // Меньше 1 рубля

    if (isIdle && isBalanceZero) {
      notifications.push({
        id: `idle_project_${project.id}`,
        type: NotificationType.PROJECT_IDLE,
        title: 'Завершить объект?',
        message: `${project.name} — нет операций более 30 дней`,
        severity: 'info',
        entityType: 'project',
        entityId: project.id,
        actionUrl: `/projects/${project.id}/edit`,
        actionLabel: 'Завершить',
        createdAt: new Date(),
        isRead: false,
      });
    }
  }

  return notifications;
}

/**
 * Получить все уведомления для пользователя
 */
export async function getNotifications(
  userId: string,
  companyId: string,
  userRole: Role
): Promise<Notification[]> {
  const notifications: Notification[] = [];

  // Owner, Partner и Accountant видят все уведомления
  if (userRole === 'OWNER' || userRole === 'PARTNER' || userRole === 'ACCOUNTANT') {
    notifications.push(...await checkLowBalanceAlerts(companyId));
    notifications.push(...await checkLargeExpenses(companyId));
    notifications.push(...await checkMissingReceipts(companyId));
    notifications.push(...await checkNegativeProjects(companyId));
    notifications.push(...await checkIdleProjects(companyId));
  }

  // Foreman видит только свои уведомления о подотчёте
  if (userRole === 'FOREMAN') {
    // Проверяем баланс его подотчётной кассы
    const myAdvance = await prisma.moneySource.findFirst({
      where: { ownerId: userId, companyId, isAdvance: true, isActive: true },
    });

    if (myAdvance) {
      const income = await prisma.transaction.aggregate({
        where: { toMoneySourceId: myAdvance.id, deletedAt: null },
        _sum: { amountCents: true },
      });
      const expense = await prisma.transaction.aggregate({
        where: {
          moneySourceId: myAdvance.id,
          type: { in: ['EXPENSE', 'PAYOUT', 'INTERNAL'] },
          deletedAt: null,
        },
        _sum: { amountCents: true },
      });
      const balance = (income._sum.amountCents || 0) - (expense._sum.amountCents || 0);

      if (balance > 0 && balance < THRESHOLDS.LOW_BALANCE_CENTS) {
        notifications.push({
          id: `my_low_balance`,
          type: NotificationType.LOW_BALANCE,
          title: 'Заканчиваются деньги',
          message: `На подотчёте осталось ${(balance / 100).toLocaleString('ru-RU')} ₽`,
          severity: 'warning',
          createdAt: new Date(),
          isRead: false,
        });
      }
    }
  }

  // Сортируем по severity и дате
  const severityOrder = { danger: 0, warning: 1, info: 2 };
  notifications.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return notifications;
}
