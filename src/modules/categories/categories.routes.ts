// ============================================
// Categories Routes
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import * as categoriesService from './categories.service';
import { CategoryError } from './categories.service';
import { validateBody, validateQuery } from '../auth/auth.schema';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { ErrorCodes } from '../../types/api.types';

const router = Router();

// ============================================
// SCHEMAS
// ============================================

const listCategoriesQuerySchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(2).max(100).trim(),
  icon: z.string().min(1).max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  allowedTypes: z.array(z.nativeEnum(TransactionType)).min(1),
  groupId: z.string().cuid().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  icon: z.string().min(1).max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// ============================================
// ROUTES
// ============================================

// Все routes требуют авторизации
router.use(authenticate);

/**
 * GET /api/categories
 * Список категорий (системные + компании)
 */
router.get(
  '/',
  validateQuery(listCategoriesQuerySchema),
  async (
    req: Request<{}, {}, {}, { type?: TransactionType }>,
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

      const result = await categoriesService.getCategories(
        req.user.companyId,
        req.query.type
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/categories/:id
 * Получение категории
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

      const category = await categoriesService.getCategoryById(
        req.params.id,
        req.user.companyId
      );

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      handleCategoryError(error, res, next);
    }
  }
);

/**
 * POST /api/categories
 * Создание пользовательской категории (OWNER)
 */
router.post(
  '/',
  requireRole('OWNER'),
  validateBody(createCategorySchema),
  async (
    req: Request<{}, {}, z.infer<typeof createCategorySchema>>,
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

      const category = await categoriesService.createCategory(
        req.user.companyId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      handleCategoryError(error, res, next);
    }
  }
);

/**
 * PATCH /api/categories/:id
 * Обновление пользовательской категории (OWNER)
 */
router.patch(
  '/:id',
  requireRole('OWNER'),
  validateBody(updateCategorySchema),
  async (
    req: Request<{ id: string }, {}, z.infer<typeof updateCategorySchema>>,
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

      const category = await categoriesService.updateCategory(
        req.params.id,
        req.user.companyId,
        req.body
      );

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      handleCategoryError(error, res, next);
    }
  }
);

/**
 * DELETE /api/categories/:id
 * Удаление пользовательской категории (OWNER)
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

      await categoriesService.deleteCategory(req.params.id, req.user.companyId);

      res.json({
        success: true,
        data: { message: 'Категория удалена' },
      });
    } catch (error) {
      handleCategoryError(error, res, next);
    }
  }
);

// ============================================
// ERROR HANDLER
// ============================================

function handleCategoryError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof CategoryError) {
    const statusMap: Record<string, number> = {
      [ErrorCodes.NOT_FOUND]: 404,
      [ErrorCodes.FORBIDDEN]: 403,
      [ErrorCodes.ALREADY_EXISTS]: 409,
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
