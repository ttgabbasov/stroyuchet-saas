// ============================================
// Analytics Service
// ============================================
// Расчет статистики и аналитики за период
// ============================================

import { prisma } from '../../lib/prisma';

export interface PeriodStats {
    incomeCents: number;
    expensesCents: number;
    profitCents: number;
    transactionCount: number;
    incomeCount: number;
    expenseCount: number;
    byCategory: {
        categoryId: string;
        categoryName: string;
        amountCents: number;
        count: number;
    }[];
    byProject?: {
        projectId: string;
        projectName: string;
        incomeCents: number;
        expensesCents: number;
        profitCents: number;
    }[];
}

/**
 * Получить статистику за период
 */
export async function getPeriodStats(
    companyId: string,
    startDate: Date,
    endDate: Date,
    includeProjects = true
): Promise<PeriodStats> {
    // Получить все транзакции за период
    const transactions = await prisma.transaction.findMany({
        where: {
            moneySource: { companyId },
            date: {
                gte: startDate,
                lte: endDate
            },
            deletedAt: null
        },
        include: {
            category: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } }
        }
    });

    // Рассчитать доходы и расходы
    let incomeCents = 0;
    let expensesCents = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    const categoryMap = new Map<string, { name: string; amount: number; count: number }>();
    const projectMap = new Map<string, { name: string; income: number; expenses: number }>();

    for (const tx of transactions) {
        if (tx.type === 'INCOME') {
            incomeCents += tx.amountCents;
            incomeCount++;

            // По проектам
            if (includeProjects && tx.project) {
                const proj = projectMap.get(tx.project.id) || { name: tx.project.name, income: 0, expenses: 0 };
                proj.income += tx.amountCents;
                projectMap.set(tx.project.id, proj);
            }
        } else if (tx.type === 'EXPENSE') {
            expensesCents += tx.amountCents;
            expenseCount++;

            // По категориям
            const cat = categoryMap.get(tx.category.id) || { name: tx.category.name, amount: 0, count: 0 };
            cat.amount += tx.amountCents;
            cat.count++;
            categoryMap.set(tx.category.id, cat);

            // По проектам
            if (includeProjects && tx.project) {
                const proj = projectMap.get(tx.project.id) || { name: tx.project.name, income: 0, expenses: 0 };
                proj.expenses += tx.amountCents;
                projectMap.set(tx.project.id, proj);
            }
        }
    }

    // Сформировать массивы
    const byCategory = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        amountCents: data.amount,
        count: data.count
    })).sort((a, b) => b.amountCents - a.amountCents); // Сортировка по убыванию

    const byProject = includeProjects
        ? Array.from(projectMap.entries()).map(([projectId, data]) => ({
            projectId,
            projectName: data.name,
            incomeCents: data.income,
            expensesCents: data.expenses,
            profitCents: data.income - data.expenses
        })).sort((a, b) => b.profitCents - a.profitCents)
        : undefined;

    return {
        incomeCents,
        expensesCents,
        profitCents: incomeCents - expensesCents,
        transactionCount: transactions.length,
        incomeCount,
        expenseCount,
        byCategory,
        byProject
    };
}

/**
 * Вспомогательные функции для расчета дат периодов
 */
export function getCurrentMonthDates(): { startDate: Date; endDate: Date } {
    const now = new Date();
    return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    };
}

export function getLastMonthDates(): { startDate: Date; endDate: Date } {
    const now = new Date();
    return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    };
}

export function getCurrentQuarterDates(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const startMonth = quarter * 3;
    return {
        startDate: new Date(now.getFullYear(), startMonth, 1, 0, 0, 0),
        endDate: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59)
    };
}

export function getCurrentYearDates(): { startDate: Date; endDate: Date } {
    const now = new Date();
    return {
        startDate: new Date(now.getFullYear(), 0, 1, 0, 0, 0),
        endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    };
}
