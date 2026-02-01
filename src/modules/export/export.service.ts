// ============================================
// Export Service
// ============================================
// CSV и Excel экспорт транзакций
// Доступно: PRO и BUSINESS планы
// ============================================

import { prisma } from '../../lib/prisma';
import { Prisma, TransactionType } from '@prisma/client';
import { ErrorCodes } from '../../types/api.types';

// ============================================
// TYPES
// ============================================

export class ExportError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

export interface ExportFilters {
  projectId?: string;
  moneySourceId?: string;
  type?: TransactionType;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeReceipts?: boolean;
}

interface TransactionRow {
  date: string;
  type: string;
  category: string;
  amount: string;
  project: string;
  moneySource: string;
  toMoneySource: string;
  payoutUser: string;
  comment: string;
  receiptStatus: string;
  createdBy: string;
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Экспорт транзакций в CSV
 */
export async function exportTransactionsToCsv(
  companyId: string,
  filters: ExportFilters = {}
): Promise<string> {
  const transactions = await fetchTransactionsForExport(companyId, filters);
  const rows = transformToRows(transactions);

  return generateCsv(rows);
}

/**
 * Экспорт транзакций в Excel (XLSX)
 */
export async function exportTransactionsToXlsx(
  companyId: string,
  filters: ExportFilters = {}
): Promise<Buffer> {
  const transactions = await fetchTransactionsForExport(companyId, filters);
  const rows = transformToRows(transactions);

  return generateXlsx(rows);
}

/**
 * Экспорт баланса проекта
 */
export async function exportProjectBalanceToCsv(
  projectId: string,
  companyId: string
): Promise<string> {
  // Verify project belongs to company
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });

  if (!project) {
    throw new ExportError(ErrorCodes.NOT_FOUND, 'Проект не найден');
  }

  const transactions = await fetchTransactionsForExport(companyId, { projectId });

  // Calculate running balance
  let runningBalance = 0;
  const rowsWithBalance = transactions.map((tx) => {
    if (tx.type === 'INCOME') {
      runningBalance += tx.amountCents;
    } else if (tx.type === 'EXPENSE') {
      runningBalance -= tx.amountCents;
    }

    return {
      ...transformSingleRow(tx),
      runningBalance: formatMoney(runningBalance),
    };
  });

  return generateCsvWithBalance(rowsWithBalance, project.name);
}

/**
 * Экспорт аналитики по категориям
 */
export async function exportCategoryAnalyticsToCsv(
  companyId: string,
  filters: ExportFilters = {}
): Promise<string> {
  const where: Prisma.TransactionWhereInput = {
    moneySource: { companyId },
    type: 'EXPENSE',
  };

  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  const analytics = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where,
    _sum: { amountCents: true },
    _count: true,
  });

  // Get category names
  const categoryIds = analytics.map((a) => a.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const rows = analytics
    .map((a) => ({
      category: categoryMap.get(a.categoryId) || 'Неизвестно',
      count: a._count,
      total: formatMoney(a._sum.amountCents || 0),
      totalCents: a._sum.amountCents || 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  // Generate CSV
  const header = 'Категория;Количество;Сумма\n';
  const body = rows
    .map((r) => `${r.category};${r.count};${r.total}`)
    .join('\n');

  const totalSum = rows.reduce((sum, r) => sum + r.totalCents, 0);
  const footer = `\nИТОГО;${rows.reduce((sum, r) => sum + r.count, 0)};${formatMoney(totalSum)}`;

  return header + body + footer;
}

// ============================================
// INTERNAL HELPERS
// ============================================

async function fetchTransactionsForExport(
  companyId: string,
  filters: ExportFilters
) {
  const where: Prisma.TransactionWhereInput = { moneySource: { companyId } };

  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.moneySourceId) where.moneySourceId = filters.moneySourceId;
  if (filters.type) where.type = filters.type;
  if (filters.categoryId) where.categoryId = filters.categoryId;

  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  return prisma.transaction.findMany({
    where,
    include: {
      category: { select: { name: true } },
      project: { select: { name: true } },
      moneySource: { select: { name: true } },
      toMoneySource: { select: { name: true } },
      payoutUser: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });
}

function transformToRows(transactions: any[]): TransactionRow[] {
  return transactions.map(transformSingleRow);
}

function transformSingleRow(tx: any): TransactionRow {
  const typeLabels: Record<string, string> = {
    INCOME: 'Доход',
    EXPENSE: 'Расход',
    PAYOUT: 'Выплата',
    INTERNAL: 'Перевод',
  };

  const receiptLabels: Record<string, string> = {
    RECEIPT: 'Есть',
    NO_RECEIPT: 'Нет',
    PENDING: 'Ожидается',
  };

  return {
    date: formatDate(tx.date),
    type: typeLabels[tx.type] || tx.type,
    category: tx.category?.name || '',
    amount: formatMoney(tx.amountCents),
    project: tx.project?.name || '',
    moneySource: tx.moneySource?.name || '',
    toMoneySource: tx.toMoneySource?.name || '',
    payoutUser: tx.payoutUser?.name || '',
    comment: tx.comment || '',
    receiptStatus: receiptLabels[tx.receiptStatus] || '',
    createdBy: tx.createdBy?.name || '',
  };
}

function generateCsv(rows: TransactionRow[]): string {
  const header = 'Дата;Тип;Категория;Сумма;Объект;Касса;В кассу;Получатель;Комментарий;Чек;Создал\n';

  const body = rows
    .map((r) =>
      [
        r.date,
        r.type,
        escapeCsvField(r.category),
        r.amount,
        escapeCsvField(r.project),
        escapeCsvField(r.moneySource),
        escapeCsvField(r.toMoneySource),
        escapeCsvField(r.payoutUser),
        escapeCsvField(r.comment),
        r.receiptStatus,
        escapeCsvField(r.createdBy),
      ].join(';')
    )
    .join('\n');

  // Add BOM for Excel to recognize UTF-8
  return '\uFEFF' + header + body;
}

function generateCsvWithBalance(
  rows: (TransactionRow & { runningBalance: string })[],
  projectName: string
): string {
  const title = `Баланс проекта: ${projectName}\n\n`;
  const header = 'Дата;Тип;Категория;Сумма;Нарастающий итог;Комментарий;Чек\n';

  const body = rows
    .map((r) =>
      [
        r.date,
        r.type,
        escapeCsvField(r.category),
        r.amount,
        r.runningBalance,
        escapeCsvField(r.comment),
        r.receiptStatus,
      ].join(';')
    )
    .join('\n');

  return '\uFEFF' + title + header + body;
}

async function generateXlsx(rows: TransactionRow[]): Promise<Buffer> {
  // Dynamic import for optional xlsx dependency
  try {
    const XLSX = await import('xlsx');

    const wsData = [
      ['Дата', 'Тип', 'Категория', 'Сумма', 'Объект', 'Касса', 'В кассу', 'Получатель', 'Комментарий', 'Чек', 'Создал'],
      ...rows.map((r) => [
        r.date,
        r.type,
        r.category,
        r.amount,
        r.project,
        r.moneySource,
        r.toMoneySource,
        r.payoutUser,
        r.comment,
        r.receiptStatus,
        r.createdBy,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Дата
      { wch: 10 }, // Тип
      { wch: 20 }, // Категория
      { wch: 15 }, // Сумма
      { wch: 25 }, // Объект
      { wch: 15 }, // Касса
      { wch: 15 }, // В кассу
      { wch: 20 }, // Получатель
      { wch: 30 }, // Комментарий
      { wch: 12 }, // Чек
      { wch: 20 }, // Создал
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Транзакции');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  } catch (error) {
    throw new ExportError(
      ErrorCodes.INTERNAL_ERROR,
      'XLSX экспорт недоступен. Установите пакет xlsx.'
    );
  }
}

function escapeCsvField(value: string): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains special chars
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
