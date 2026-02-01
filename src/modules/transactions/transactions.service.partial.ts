import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
    AnalyticsSummary,
    CategorySummary,
    ProjectSummary,
    DailyHistory
} from '../../types/api.types.js';

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
    // (Helper function assumed to exist or be implemented here)
    const byCategory: CategorySummary[] = [];

    // 3. Доходы и расходы по проектам
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
