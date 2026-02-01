// ============================================
// MoneySource Routes (Кассы)
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as moneySourcesService from './money-sources.service';
import { MoneySourceError } from './money-sources.service';
import { validateBody } from '../auth/auth.schema';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { ErrorCodes } from '../../types/api.types';

const router = Router();

// ============================================
// SCHEMAS
// ============================================

const createMoneySourceSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  isCompanyMain: z.boolean().optional(),
});

const updateMoneySourceSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  isCompanyMain: z.boolean().optional(),
});

const shareMoneySourceSchema = z.object({
  userId: z.string().cuid(),
  canView: z.boolean().optional(),
  canSpend: z.boolean().optional(),
});

// ============================================
// ROUTES
// ============================================

router.use(authenticate);

/**
 * GET /api/money-sources
 * Список касс (с учётом доступа)
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      const moneySources = await moneySourcesService.listMoneySources(
        req.user.companyId,
        req.user.userId,
        req.user.role
      );

      res.json({
        success: true,
        data: moneySources,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/money-sources
 * Создание кассы (OWNER, FOREMAN)
 */
router.post(
  '/',
  requireRole('OWNER', 'FOREMAN'),
  validateBody(createMoneySourceSchema),
  async (
    req: Request<{}, {}, z.infer<typeof createMoneySourceSchema>>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      // Только OWNER может создать главную кассу
      if (req.body.isCompanyMain && req.user.role !== 'OWNER') {
        res.status(403).json({
          success: false,
          error: { code: ErrorCodes.FORBIDDEN, message: 'Только владелец может создать главную кассу' },
        });
        return;
      }

      const moneySource = await moneySourcesService.createMoneySource(
        req.user.companyId,
        req.user.userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: moneySource,
      });
    } catch (error) {
      handleMoneySourceError(error, res, next);
    }
  }
);

/**
 * GET /api/money-sources/:id
 * Получение кассы
 */
router.get(
  '/:id',
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      const moneySource = await moneySourcesService.getMoneySource(
        req.params.id,
        req.user.userId,
        req.user.role
      );

      res.json({
        success: true,
        data: moneySource,
      });
    } catch (error) {
      handleMoneySourceError(error, res, next);
    }
  }
);

/**
 * PATCH /api/money-sources/:id
 * Обновление кассы (OWNER или владелец кассы)
 */
router.patch(
  '/:id',
  validateBody(updateMoneySourceSchema),
  async (
    req: Request<{ id: string }, {}, z.infer<typeof updateMoneySourceSchema>>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      // Проверяем права
      const access = await moneySourcesService.checkMoneySourceAccess(
        req.params.id,
        req.user.userId,
        req.user.role
      );

      // Только владелец кассы или OWNER компании
      if (req.user.role !== 'OWNER' && !access.canSpend) {
        res.status(403).json({
          success: false,
          error: { code: ErrorCodes.FORBIDDEN, message: 'Нет прав на редактирование' },
        });
        return;
      }

      // Только OWNER может менять isCompanyMain
      if (req.body.isCompanyMain !== undefined && req.user.role !== 'OWNER') {
        res.status(403).json({
          success: false,
          error: { code: ErrorCodes.FORBIDDEN, message: 'Только владелец может изменить главную кассу' },
        });
        return;
      }

      const moneySource = await moneySourcesService.updateMoneySource(
        req.params.id,
        req.user.companyId,
        req.body
      );

      res.json({
        success: true,
        data: moneySource,
      });
    } catch (error) {
      handleMoneySourceError(error, res, next);
    }
  }
);

/**
 * DELETE /api/money-sources/:id
 * Деактивация кассы (только OWNER)
 */
router.delete(
  '/:id',
  requireRole('OWNER'),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      await moneySourcesService.deactivateMoneySource(
        req.params.id,
        req.user.companyId
      );

      res.json({
        success: true,
        data: { message: 'Касса деактивирована' },
      });
    } catch (error) {
      handleMoneySourceError(error, res, next);
    }
  }
);

// ============================================
// SHARING
// ============================================

/**
 * POST /api/money-sources/:id/share
 * Добавление доступа к кассе (OWNER или владелец кассы)
 */
router.post(
  '/:id/share',
  validateBody(shareMoneySourceSchema),
  async (
    req: Request<{ id: string }, {}, z.infer<typeof shareMoneySourceSchema>>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      // Проверяем права
      const access = await moneySourcesService.checkMoneySourceAccess(
        req.params.id,
        req.user.userId,
        req.user.role
      );

      if (req.user.role !== 'OWNER' && !access.canSpend) {
        res.status(403).json({
          success: false,
          error: { code: ErrorCodes.FORBIDDEN, message: 'Нет прав на управление доступом' },
        });
        return;
      }

      await moneySourcesService.shareMoneySource(
        req.params.id,
        req.user.companyId,
        req.body
      );

      res.json({
        success: true,
        data: { message: 'Доступ добавлен' },
      });
    } catch (error) {
      handleMoneySourceError(error, res, next);
    }
  }
);

/**
 * DELETE /api/money-sources/:id/share/:userId
 * Удаление доступа к кассе
 */
router.delete(
  '/:id/share/:userId',
  async (req: Request<{ id: string; userId: string }>, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      // Проверяем права
      const access = await moneySourcesService.checkMoneySourceAccess(
        req.params.id,
        req.user.userId,
        req.user.role
      );

      if (req.user.role !== 'OWNER' && !access.canSpend) {
        res.status(403).json({
          success: false,
          error: { code: ErrorCodes.FORBIDDEN, message: 'Нет прав на управление доступом' },
        });
        return;
      }

      await moneySourcesService.unshareMoneySource(
        req.params.id,
        req.params.userId,
        req.user.companyId
      );

      res.json({
        success: true,
        data: { message: 'Доступ удалён' },
      });
    } catch (error) {
      handleMoneySourceError(error, res, next);
    }
  }
);

// ============================================
// ERROR HANDLER
// ============================================

function handleMoneySourceError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof MoneySourceError) {
    const statusMap: Record<string, number> = {
      [ErrorCodes.NOT_FOUND]: 404,
      [ErrorCodes.FORBIDDEN]: 403,
      [ErrorCodes.PLAN_LIMIT_EXCEEDED]: 403,
      [ErrorCodes.INVALID_INPUT]: 400,
    };

    const status = statusMap[error.code] || 400;

    res.status(status).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  next(error);
}

export default router;
