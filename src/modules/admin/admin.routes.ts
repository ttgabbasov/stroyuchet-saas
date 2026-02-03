// ============================================
// Admin Routes
// ============================================
// GET /api/admin/users - Список всех пользователей (только для владельцев компаний)
// ============================================

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as adminService from './admin.service';

const router = Router();

/**
 * GET /api/admin/users
 * Получить список всех пользователей с их тарифами
 */
router.get('/users', authenticate, async (req, res, next) => {
    try {
        // Проверяем, что пользователь - владелец компании
        if (req.user!.role !== 'OWNER') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Только владельцы компаний могут просматривать список пользователей',
                },
            });
        }

        const users = await adminService.getAllUsers();

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
