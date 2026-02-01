import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateQuery } from '../../middleware/validate.middleware';
import { z } from 'zod';
import * as analyticsService from './analytics.service.js';

const router = Router();

// Все routes требуют авторизации
router.use(authenticate);

/**
 * GET /api/analytics/period
 * Получить статистику за произвольный период
 */
router.get(
    '/period',
    requireRole('OWNER', 'PARTNER', 'ACCOUNTANT'),
    validateQuery(z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
    })),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { startDate, endDate } = req.query;
            const stats = await analyticsService.getPeriodStats(
                req.user!.companyId,
                new Date(startDate as string),
                new Date(endDate as string)
            );
            res.json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/analytics/presets
 * Получить пресеты (этот месяц, прошлый месяц и т.д.)
 */
router.get(
    '/presets',
    requireRole('OWNER', 'PARTNER', 'ACCOUNTANT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const companyId = req.user!.companyId;

            const fetchStats = async (dates: { startDate: Date, endDate: Date }) =>
                analyticsService.getPeriodStats(companyId, dates.startDate, dates.endDate);

            const [thisMonth, lastMonth, thisQuarter, thisYear] = await Promise.all([
                fetchStats(analyticsService.getCurrentMonthDates()),
                fetchStats(analyticsService.getLastMonthDates()),
                fetchStats(analyticsService.getCurrentQuarterDates()),
                fetchStats(analyticsService.getCurrentYearDates()),
            ]);

            res.json({
                success: true,
                data: {
                    thisMonth,
                    lastMonth,
                    thisQuarter,
                    thisYear
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
