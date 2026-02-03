// ============================================
// Admin Service
// ============================================
// Бизнес-логика для административных функций
// ============================================

import { prisma } from '../../lib/prisma';

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
