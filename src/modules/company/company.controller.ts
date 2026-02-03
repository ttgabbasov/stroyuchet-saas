
import { Request, Response, NextFunction } from 'express';
import * as companyService from './company.service';
import { ErrorCodes } from '../../types/api.types';

/**
 * PATCH /api/companies/current
 * Обновление текущей компании
 */
export async function updateCurrentCompany(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
            });
            return;
        }

        // Проверяем, что пользователь - владелец
        if (req.user.role !== 'OWNER') {
            res.status(403).json({
                success: false,
                error: { code: ErrorCodes.FORBIDDEN, message: 'Только владелец может менять настройки компании' },
            });
            return;
        }

        const { name } = req.body;

        await companyService.updateCompany(req.user.companyId, {
            name,
        });

        // Возвращаем обновленный объект компании в формате, который ждёт фронтенд
        const companyData = await companyService.getCompany(req.user.companyId);

        res.json(companyData);
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/companies/current
 * Получение текущей компании
 */
export async function getCurrentCompany(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
            });
            return;
        }

        const companyData = await companyService.getCompany(req.user.companyId);
        res.json(companyData);
    } catch (error) {
        next(error);
    }
}
