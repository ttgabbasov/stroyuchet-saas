// ============================================
// Advance Service - Подотчёт сотруднику
// ============================================
// Автоматическое создание кассы при выдаче подотчёта
// ============================================

import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';
import { ErrorCodes } from '../../types/api.types';

export class AdvanceError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AdvanceError';
  }
}

export interface CreateAdvanceInput {
  moneySourceId: string;      // Из какой кассы
  recipientUserId: string;    // Кому
  amountCents: number;        // Сумма
  categoryId: string;         // Категория
  date: string;               // Дата
  projectId?: string;         // Объект (опционально)
  comment?: string;           // Комментарий
}

export interface AdvanceResult {
  transaction: {
    id: string;
    amountCents: number;
    date: string;
  };
  recipientMoneySource: {
    id: string;
    name: string;
    isNew: boolean;  // Была ли касса создана
  };
}

/**
 * Выдача подотчёта сотруднику
 * 
 * Логика:
 * 1. Проверяем права (только OWNER/ACCOUNTANT)
 * 2. Проверяем что получатель в той же компании
 * 3. Ищем или создаём кассу "Подотчёт: {Имя}"
 * 4. Создаём транзакцию ADVANCE
 */
export async function createAdvance(
  input: CreateAdvanceInput,
  userId: string,
  companyId: string,
  userRole: Role
): Promise<AdvanceResult> {
  
  // 1. Проверяем права - только OWNER и ACCOUNTANT могут выдавать подотчёт
  if (userRole !== 'OWNER' && userRole !== 'ACCOUNTANT') {
    throw new AdvanceError(ErrorCodes.FORBIDDEN, 'Только владелец или бухгалтер может выдавать подотчёт');
  }

  // 2. Проверяем кассу-источник
  const sourceMoneySource = await prisma.moneySource.findFirst({
    where: { 
      id: input.moneySourceId, 
      companyId, 
      isActive: true 
    },
  });

  if (!sourceMoneySource) {
    throw new AdvanceError(ErrorCodes.NOT_FOUND, 'Касса-источник не найдена');
  }

  // 3. Проверяем получателя
  const recipient = await prisma.user.findFirst({
    where: { 
      id: input.recipientUserId, 
      companyId 
    },
    select: { id: true, name: true, role: true },
  });

  if (!recipient) {
    throw new AdvanceError(ErrorCodes.NOT_FOUND, 'Получатель не найден');
  }

  // 4. Проверяем категорию
  const category = await prisma.category.findFirst({
    where: { 
      id: input.categoryId,
      allowedTypes: { has: 'ADVANCE' },
    },
  });

  if (!category) {
    throw new AdvanceError(ErrorCodes.NOT_FOUND, 'Категория не найдена или не поддерживает подотчёт');
  }

  // 5. Проверяем проект если указан
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, companyId },
    });
    if (!project) {
      throw new AdvanceError(ErrorCodes.NOT_FOUND, 'Объект не найден');
    }
  }

  // 6. Ищем существующую подотчётную кассу получателя
  let recipientMoneySource = await prisma.moneySource.findFirst({
    where: {
      ownerId: recipient.id,
      companyId,
      isAdvance: true,
      isActive: true,
    },
  });

  let isNewMoneySource = false;

  // 7. Если кассы нет — создаём
  if (!recipientMoneySource) {
    recipientMoneySource = await prisma.moneySource.create({
      data: {
        name: `Подотчёт: ${recipient.name}`,
        description: 'Автоматически созданная подотчётная касса',
        ownerId: recipient.id,
        companyId,
        isAdvance: true,
        isCompanyMain: false,
      },
    });
    isNewMoneySource = true;
  }

  // 8. Создаём транзакцию ADVANCE
  const transaction = await prisma.transaction.create({
    data: {
      type: 'ADVANCE',
      amountCents: Math.abs(input.amountCents),
      categoryId: input.categoryId,
      moneySourceId: input.moneySourceId,
      toMoneySourceId: recipientMoneySource.id,
      payoutUserId: recipient.id,
      projectId: input.projectId,
      date: new Date(input.date),
      comment: input.comment || `Подотчёт для ${recipient.name}`,
      receiptStatus: 'NO_RECEIPT',
      createdById: userId,
    },
  });

  return {
    transaction: {
      id: transaction.id,
      amountCents: transaction.amountCents,
      date: transaction.date.toISOString().split('T')[0],
    },
    recipientMoneySource: {
      id: recipientMoneySource.id,
      name: recipientMoneySource.name,
      isNew: isNewMoneySource,
    },
  };
}

/**
 * Получение подотчётной кассы пользователя
 */
export async function getAdvanceMoneySource(
  userId: string,
  companyId: string
) {
  return prisma.moneySource.findFirst({
    where: {
      ownerId: userId,
      companyId,
      isAdvance: true,
      isActive: true,
    },
  });
}

/**
 * Список подотчётов (выданных и полученных)
 */
export async function getAdvanceHistory(
  companyId: string,
  filters: {
    recipientUserId?: string;
    issuedByUserId?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
) {
  const where: any = {
    type: 'ADVANCE',
    moneySource: { companyId },
    deletedAt: null,
  };

  if (filters.recipientUserId) {
    where.payoutUserId = filters.recipientUserId;
  }
  if (filters.issuedByUserId) {
    where.createdById = filters.issuedByUserId;
  }
  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  return prisma.transaction.findMany({
    where,
    include: {
      category: true,
      createdBy: { select: { id: true, name: true } },
      moneySource: { select: { id: true, name: true } },
      toMoneySource: { select: { id: true, name: true } },
      payoutUser: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });
}
