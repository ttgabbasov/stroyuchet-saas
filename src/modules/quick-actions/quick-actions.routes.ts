// ============================================
// Quick Actions Routes
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { z } from 'zod';
import * as quickActionsService from './quick-actions.service';
import { ErrorCodes } from '../../types/api.types';

const router = Router();

router.use(authenticate);

// ============================================
// SCHEMAS
// ============================================

const returnAdvanceSchema = z.object({
  toMoneySourceId: z.string().cuid(),
  amountCents: z.number().int().min(1).optional(),
});

const closeProjectSchema = z.object({
  projectId: z.string().cuid(),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/quick-actions/templates
 * Получить шаблоны быстрых действий
 */
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await quickActionsService.getQuickActionTemplates(
      req.user!.userId,
      req.user!.companyId,
      req.user!.role
    );

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/quick-actions/return-advance
 * Вернуть остаток подотчёта
 */
router.post(
  '/return-advance',
  validateBody(returnAdvanceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await quickActionsService.returnAdvanceBalance(
        req.user!.userId,
        req.user!.companyId,
        req.user!.role,
        req.body.toMoneySourceId,
        req.body.amountCents
      );

      res.json({
        success: true,
        data: result,
        message: `Возвращено ${(result.transaction.amountCents / 100).toLocaleString('ru-RU')} ₽`,
      });
    } catch (error) {
      if (error instanceof quickActionsService.QuickActionError) {
        const statusMap: Record<string, number> = {
          [ErrorCodes.NOT_FOUND]: 404,
          [ErrorCodes.FORBIDDEN]: 403,
          [ErrorCodes.INVALID_INPUT]: 400,
        };
        res.status(statusMap[error.code] || 400).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/quick-actions/project-close-summary/:id
 * Сводка для закрытия объекта
 */
router.get(
  '/project-close-summary/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await quickActionsService.getProjectCloseSummary(
        req.params.id,
        req.user!.companyId
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      if (error instanceof quickActionsService.QuickActionError) {
        res.status(404).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/quick-actions/close-project
 * Закрыть объект
 */
router.post(
  '/close-project',
  requireRole('OWNER', 'ACCOUNTANT'),
  validateBody(closeProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await quickActionsService.closeProject(
        req.body.projectId,
        req.user!.userId,
        req.user!.companyId,
        req.user!.role
      );

      res.json({
        success: true,
        data: result,
        message: `Объект "${result.projectName}" завершён`,
      });
    } catch (error) {
      if (error instanceof quickActionsService.QuickActionError) {
        const statusMap: Record<string, number> = {
          [ErrorCodes.NOT_FOUND]: 404,
          [ErrorCodes.FORBIDDEN]: 403,
          [ErrorCodes.INVALID_INPUT]: 400,
        };
        res.status(statusMap[error.code] || 400).json({
          success: false,
          error: { code: error.code, message: error.message },
        });
        return;
      }
      next(error);
    }
  }
);

export default router;
