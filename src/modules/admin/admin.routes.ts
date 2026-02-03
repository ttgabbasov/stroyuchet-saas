// ============================================
// Admin Routes
// ============================================
// Административные функции (только для super admin)
// ============================================

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from './admin.middleware';
import * as adminService from './admin.service';

const router = Router();

// Все routes защищены authenticate + requireSuperAdmin
router.use(authenticate, requireSuperAdmin);

/**
 * GET /api/admin/me
 * Проверить, является ли пользователь супер-админом
 */
router.get('/me', async (req, res) => {
    // Если дошли до этого handler, значит пользователь - супер-админ
    res.json({
        success: true,
        data: {
            isSuperAdmin: true,
            email: req.user!.email,
        },
    });
});

/**
 * GET /api/admin/users
 * Получить список всех пользователей с их тарифами и компаниями
 */
router.get('/users', async (_req, res, next) => {
    try {
        const users = await adminService.getAllUsers();

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/stats
 * Получить общую статистику по всем компаниям
 */
router.get('/stats', async (_req, res, next) => {
    try {
        const stats = await adminService.getStats();

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/admin/companies/:id/plan
 * Изменить тариф компании
 */
router.patch('/companies/:id/plan', async (req, res, next) => {
    try {
        const { plan, expiresAt } = req.body;

        const company = await adminService.updateCompanyPlan(req.params.id, plan, expiresAt);

        res.json({
            success: true,
            data: company,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/users/:id
 * Удалить пользователя
 */
router.delete('/users/:id', async (req, res, next) => {
    try {
        await adminService.deleteUser(req.params.id);

        res.json({
            success: true,
            message: 'Пользователь удален',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/companies/:id
 * Удалить компанию и всех её пользователей
 */
router.delete('/companies/:id', async (req, res, next) => {
    try {
        await adminService.deleteCompany(req.params.id);

        res.json({
            success: true,
            message: 'Компания удалена',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/activity
 * Получить последнюю активность пользователей
 */
router.get('/activity', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const activity = await adminService.getRecentActivity(limit);

        res.json({
            success: true,
            data: activity,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
