
import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../middleware/error.middleware';

/**
 * Обновление данных компании
 */
export async function updateCompany(
    companyId: string,
    data: { name?: string; address?: string | null; website?: string | null }
) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!company) {
        throw new NotFoundError('Компания не найдена');
    }

    const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
            ...data,
        },
    });

    return updatedCompany;
}

/**
 * Получение данных компании
 */
export async function getCompany(companyId: string) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
            subscription: true, // Включаем подписку, если она есть
            _count: {
                select: {
                    users: true,
                    projects: true,
                },
            },
        },
    });

    if (!company) {
        throw new NotFoundError('Компания не найдена');
    }

    // Формируем ответ, похожий на то, что ждёт фронтенд (Store)
    return {
        id: company.id,
        name: company.name,
        plan: company.subscription?.plan || 'FREE',
        maxUsers: company.subscription?.maxUsers || 1,
        maxProjects: company.subscription?.maxProjects || 1,
        usersCount: company._count.users,
        projectsCount: company._count.projects,
        createdAt: company.createdAt,
    };
}
