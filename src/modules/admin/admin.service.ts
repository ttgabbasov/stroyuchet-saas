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
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            company: {
                select: {
                    id: true,
                    name: true,
                    plan: true,
                    planExpiresAt: true,
                    createdAt: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    // Получаем счетчики отдельно
    const companiesWithCounts = await Promise.all(
        users.map(async user => {
            if (!user.company) return null;

            const [usersCount, projectsCount] = await Promise.all([
                prisma.user.count({ where: { companyId: user.company.id } }),
                prisma.project.count({ where: { companyId: user.company.id } }),
            ]);

            return {
                companyId: user.company.id,
                usersCount,
                projectsCount,
            };
        })
    );

    const countsMap = new Map(
        companiesWithCounts
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .map(c => [c.companyId, c])
    );

    return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        company: user.company ? {
            id: user.company.id,
            name: user.company.name,
            plan: user.company.plan,
            planExpiresAt: user.company.planExpiresAt?.toISOString() || null,
            createdAt: user.company.createdAt.toISOString(),
            usersCount: countsMap.get(user.company.id)?.usersCount || 0,
            projectsCount: countsMap.get(user.company.id)?.projectsCount || 0,
        } : null,
    }));
}
