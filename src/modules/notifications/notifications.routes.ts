// ============================================
// Notifications Routes
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as notificationsService from './notifications.service';

const router = Router();

router.use(authenticate);

/**
 * GET /api/notifications
 * Получить уведомления текущего пользователя
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationsService.getNotifications(
      req.user!.userId,
      req.user!.companyId,
      req.user!.role
    );

    res.json({
      success: true,
      data: notifications,
      meta: {
        total: notifications.length,
        unread: notifications.filter(n => !n.isRead).length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/count
 * Количество непрочитанных уведомлений (для бейджа)
 */
router.get('/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationsService.getNotifications(
      req.user!.userId,
      req.user!.companyId,
      req.user!.role
    );

    const dangerCount = notifications.filter(n => n.severity === 'danger').length;
    const warningCount = notifications.filter(n => n.severity === 'warning').length;

    res.json({
      success: true,
      data: {
        total: notifications.length,
        danger: dangerCount,
        warning: warningCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
