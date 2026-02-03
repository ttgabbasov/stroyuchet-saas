// ============================================
// Admin Service
// ============================================
// Бизнес-логика для административных функций
// ============================================

import { prisma } from '../../lib/prisma';
import { Plan } from '@prisma/client';

/**
 * Получить список всех пользователей с их тарифами и компаниями
 */
export async function getAllUsers() {
    // Получаем всех пользователей с компаниями
    const usersWithCompanies = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            companyId: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    // Получаем уникальные ID компаний
    const companyIds = [...new Set(usersWithCompanies.map(u => u.companyId))];

    // Получаем информацию о компаниях
    const companies = await prisma.company.findMany({
        where: {
            id: { in: companyIds },
        },
        select: {
            id: true,
            name: true,
            plan: true,
            planExpiresAt: true,
            createdAt: true,
        },
    });

    // Получаем счетчики для каждой компании
    const companiesWithCounts = await Promise.all(
        companies.map(async (company) => {
            const [usersCount, projectsCount] = await Promise.all([
                prisma.user.count({ where: { companyId: company.id } }),
                prisma.project.count({ where: { companyId: company.id } }),
            ]);

            return {
                ...company,
                usersCount,
                projectsCount,
            };
        })
    );

    const companiesMap = new Map(companiesWithCounts.map(c => [c.id, c]));

    // Форматируем результат
    return usersWithCompanies.map(user => {
        const company = companiesMap.get(user.companyId);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            createdAt: user.createdAt.toISOString(),
            company: company ? {
                id: company.id,
                name: company.name,
                plan: company.plan,
                planExpiresAt: company.planExpiresAt?.toISOString() || null,
                createdAt: company.createdAt.toISOString(),
                usersCount: company.usersCount,
                projectsCount: company.projectsCount,
            } : null,
        };
    });
}

/**
 * Получить общую статистику
 */
export async function getStats() {
    const [
        totalUsers,
        totalCompanies,
        freeCompanies,
        proCompanies,
        businessCompanies,
        totalProjects,
        totalTransactions,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.company.count(),
        prisma.company.count({ where: { plan: 'FREE' } }),
        prisma.company.count({ where: { plan: 'PRO' } }),
        prisma.company.count({ where: { plan: 'BUSINESS' } }),
        prisma.project.count(),
        prisma.transaction.count(),
    ]);

    // Расчет MRR (Monthly Recurring Revenue)
    const now = new Date();
    const activeProCompanies = await prisma.company.count({
        where: {
            plan: 'PRO',
            OR: [
                { planExpiresAt: { gte: now } },
                { planExpiresAt: null },
            ],
        },
    });

    const activeBusinessCompanies = await prisma.company.count({
        where: {
            plan: 'BUSINESS',
            OR: [
                { planExpiresAt: { gte: now } },
                { planExpiresAt: null },
            ],
        },
    });

    // Предполагаемые цены (нужно будет обновить на реальные)
    const PRO_PRICE = 990; // руб/мес
    const BUSINESS_PRICE = 2990; // руб/мес

    const mrr = (activeProCompanies * PRO_PRICE) + (activeBusinessCompanies * BUSINESS_PRICE);

    // Новые пользователи за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersLast30Days = await prisma.user.count({
        where: {
            createdAt: { gte: thirtyDaysAgo },
        },
    });

    const newCompaniesLast30Days = await prisma.company.count({
        where: {
            createdAt: { gte: thirtyDaysAgo },
        },
    });

    return {
        users: {
            total: totalUsers,
            newLast30Days: newUsersLast30Days,
        },
        companies: {
            total: totalCompanies,
            newLast30Days: newCompaniesLast30Days,
            byPlan: {
                FREE: freeCompanies,
                PRO: proCompanies,
                BUSINESS: businessCompanies,
            },
            active: {
                PRO: activeProCompanies,
                BUSINESS: activeBusinessCompanies,
            },
        },
        projects: {
            total: totalProjects,
        },
        transactions: {
            total: totalTransactions,
        },
        revenue: {
            mrr: mrr,
            currency: 'RUB',
        },
    };
}

/**
 * Изменить тариф компании
 */
export async function updateCompanyPlan(companyId: string, plan: Plan, expiresAt?: string) {
    const company = await prisma.company.update({
        where: { id: companyId },
        data: {
            plan,
            planExpiresAt: expiresAt ? new Date(expiresAt) : null,
        },
    });

    return {
        id: company.id,
        name: company.name,
        plan: company.plan,
        planExpiresAt: company.planExpiresAt?.toISOString() || null,
    };
}

/**
 * Удалить пользователя
 */
export async function deleteUser(userId: string) {
    await prisma.user.delete({
        where: { id: userId },
    });
}

/**
 * Удалить компанию и всех её пользователей
 */
export async function deleteCompany(companyId: string) {
    // Prisma автоматически удалит связанные записи благодаря onDelete: Cascade
    await prisma.company.delete({
        where: { id: companyId },
    });
}

/**
 * Получить последнюю активность
 */
export async function getRecentActivity(limit: number = 50) {
    const activities = await prisma.auditLog.findMany({
        take: limit,
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    return activities.map(log => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        user: log.user,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
    }));
}
