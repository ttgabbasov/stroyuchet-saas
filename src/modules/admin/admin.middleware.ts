// ============================================
// Admin Middleware
// ============================================
// Проверка доступа к админ-панели
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ErrorCodes } from '../../types/api.types';

// Список email администраторов (из переменных окружения)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

/**
 * Middleware для проверки прав супер-администратора
 * Только пользователи из списка ADMIN_EMAILS могут получить доступ
 */
export function requireSuperAdmin(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Требуется авторизация',
            },
        });
        return;
    }

    const userEmail = req.user.email?.toLowerCase();

    if (!ADMIN_EMAILS.includes(userEmail)) {
        res.status(403).json({
            success: false,
            error: {
                code: ErrorCodes.FORBIDDEN,
                message: 'Доступ запрещен',
            },
        });
        return;
    }

    next();
}

/**
 * Проверка, является ли пользователь супер-администратором
 */
export function isSuperAdmin(email: string): boolean {
    return ADMIN_EMAILS.includes(email.toLowerCase());
}
