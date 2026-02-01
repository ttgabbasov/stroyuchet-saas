// ============================================
// Advance Routes - Подотчёт
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { z } from 'zod';
import * as advanceService from './advance.service';
import { ErrorCodes } from '../../types/api.types';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// ============================================
// SCHEMAS
// ============================================

const createAdvanceSchema = z.object({
  moneySourceId: z.string().cuid(),
  recipientUserId: z.string().cuid(),
  amountCents: z.number().int().min(1),
  categoryId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  projectId: z.string().cuid().optional(),
  comment: z.string().max(500).optional(),
});

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/advance
 * Выдать подотчёт сотруднику
 */
router.post(
  '/',
  requireRole('OWNER', 'ACCOUNTANT'),
  validateBody(createAdvanceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await advanceService.createAdvance(
        req.body,
        req.user!.userId,
        req.user!.companyId,
        req.user!.role
      );

      res.status(201).json({
        success: true,
        data: result,
        message: result.recipientMoneySource.isNew
          ? `Подотчёт выдан. Создана касса "${result.recipientMoneySource.name}"`
          : `Подотчёт выдан на кассу "${result.recipientMoneySource.name}"`,
      });
    } catch (error) {
      if (error instanceof advanceService.AdvanceError) {
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
 * GET /api/advance/history
 * История подотчётов
 */
router.get(
  '/history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        recipientUserId: req.query.recipientUserId as string | undefined,
        issuedByUserId: req.query.issuedByUserId as string | undefined,
        projectId: req.query.projectId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };

      const advances = await advanceService.getAdvanceHistory(
        req.user!.companyId,
        filters
      );

      res.json({
        success: true,
        data: advances,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/advance/my-wallet
 * Моя подотчётная касса
 */
router.get(
  '/my-wallet',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallet = await advanceService.getAdvanceMoneySource(
        req.user!.userId,
        req.user!.companyId
      );

      res.json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
