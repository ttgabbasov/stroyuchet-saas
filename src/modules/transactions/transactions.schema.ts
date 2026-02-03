// ============================================
// Transactions Validation Schemas v3 (Zod)
// ============================================
// + ADVANCE (Подотчёт) - автоматическое создание кассы
// ============================================

import { z } from 'zod';
import { TransactionType, ReceiptStatus } from '@prisma/client';

// ============================================
// REQUEST SCHEMAS
// ============================================

/**
 * Базовая схема создания транзакции
 */
const baseTransactionSchema = z.object({
  moneySourceId: z.string().cuid('Некорректный ID кассы'),
  amountCents: z
    .number()
    .int('Сумма должна быть целым числом')
    .min(1, 'Сумма должна быть больше 0'),
  categoryId: z.string().cuid('Некорректный ID категории'),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format. Use ISO 8601 (e.g., 2024-01-31T14:30:00Z or YYYY-MM-DD)'
    }),
  comment: z
    .string()
    .max(500, 'Максимум 500 символов')
    .trim()
    .optional(),
  receiptStatus: z.nativeEnum(ReceiptStatus).default('NO_RECEIPT'),
  receiptUrl: z.string().url().optional(),
});

/**
 * INCOME - Доход проекта
 */
export const createIncomeSchema = baseTransactionSchema.extend({
  type: z.literal('INCOME'),
  projectId: z.string().cuid('Некорректный ID проекта'),
});

/**
 * EXPENSE - Расход проекта
 */
export const createExpenseSchema = baseTransactionSchema.extend({
  type: z.literal('EXPENSE'),
  projectId: z.string().cuid('Некорректный ID проекта'),
});

/**
 * PAYOUT - Выплата сотруднику (зарплата, премия)
 */
export const createPayoutSchema = baseTransactionSchema.extend({
  type: z.literal('PAYOUT'),
  projectId: z.string().cuid('Некорректный ID проекта').optional(),
  payoutUserId: z.string().cuid('Некорректный ID получателя'),
});

/**
 * INTERNAL - Перевод между кассами
 */
export const createInternalSchema = baseTransactionSchema.extend({
  type: z.literal('INTERNAL'),
  toMoneySourceId: z.string().cuid('Некорректный ID кассы-получателя'),
  projectId: z.string().cuid().optional(),
});

/**
 * ADVANCE - Подотчёт сотруднику
 * Автоматически создаёт кассу "Подотчёт: {Имя}" если её нет
 */
export const createAdvanceSchema = baseTransactionSchema.extend({
  type: z.literal('ADVANCE'),
  recipientUserId: z.string().cuid('Некорректный ID получателя'),
  projectId: z.string().cuid('Некорректный ID проекта').optional(),
});

/**
 * Универсальная схема создания (discriminated union)
 */
export const createTransactionSchema = z.discriminatedUnion('type', [
  createIncomeSchema,
  createExpenseSchema,
  createPayoutSchema,
  createInternalSchema,
  createAdvanceSchema,
]);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;
export type CreateInternalInput = z.infer<typeof createInternalSchema>;
export type CreateAdvanceInput = z.infer<typeof createAdvanceSchema>;

/**
 * Обновление транзакции
 */
export const updateTransactionSchema = z.object({
  amountCents: z
    .number()
    .int('Сумма должна быть целым числом')
    .min(1, 'Сумма должна быть больше 0')
    .optional(),
  categoryId: z.string().cuid('Некорректный ID категории').optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD')
    .optional(),
  comment: z
    .string()
    .max(500, 'Максимум 500 символов')
    .trim()
    .nullable()
    .optional(),
  receiptStatus: z.nativeEnum(ReceiptStatus).optional(),
  receiptUrl: z.string().url().nullable().optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

/**
 * Query параметры для списка транзакций
 */
export const listTransactionsQuerySchema = z.object({
  projectId: z.string().cuid().optional(),
  moneySourceId: z.string().cuid().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  categoryId: z.string().cuid().optional(),
  createdById: z.string().cuid().optional(),
  payoutUserId: z.string().cuid().optional(),
  dateFrom: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format. Use ISO 8601 (e.g., 2024-01-31T14:30:00Z or YYYY-MM-DD)'
    })
    .transform((val) => new Date(val).toISOString()) // Normalize to ISO
    .optional(),
  dateTo: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format. Use ISO 8601 (e.g., 2024-01-31T14:30:00Z or YYYY-MM-DD)'
    })
    .transform((val) => new Date(val).toISOString()) // Normalize to ISO
    .optional(),
  receiptStatus: z.nativeEnum(ReceiptStatus).optional(),
  includeDeleted: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

/**
 * Query для транзакций с нарастающим итогом
 */
export const runningBalanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type RunningBalanceQuery = z.infer<typeof runningBalanceQuerySchema>;
