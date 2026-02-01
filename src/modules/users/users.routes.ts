// ============================================
// Users Routes
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as usersService from './users.service';
import { UserError } from './users.service';
import { validateBody } from '../auth/auth.schema';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { ErrorCodes } from '../../types/api.types';

const router = Router();

// Все routes требуют авторизации
router.use(authenticate);

// ============================================
// SCHEMAS
// ============================================

const updateRoleSchema = z.object({
  role: z.enum(['FOREMAN', 'ACCOUNTANT', 'VIEWER']),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/users
 * Список пользователей компании
 */
router.get(
  '/',
  requireRole('OWNER', 'ACCOUNTANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      const users = await usersService.listCompanyUsers(req.user.companyId);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/telegram-link
 * Генерация ссылки для привязки Telegram
 */
router.get(
  '/telegram-link',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
        });
        return;
      }

      const token = await usersService.generateTelegramLinkToken(req.user.userId);

      const { TelegramBotService } = await import('../telegram/index.js');
      const botService = TelegramBotService.getInstance();
      const botName = botService?.getBotUsername() || 'StroyUchetBot';

      res.json({
        success: true,
        data: {
          token,
          link: `https://t.me/${botName}?start=${token}`
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/users/:id/role
 * Изменение роли пользователя
 */
router.patch(
  '/:id/role',
  requireRole('OWNER'),
  validateBody(updateRoleSchema),
  async (
    req: Request<{ id: string }, {}, { role: 'FOREMAN' | 'ACCOUNTANT' | 'VIEWER' }>,
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

      await usersService.updateUserRole(
        req.params.id,
        req.user.companyId,
        req.body.role,
        req.user.userId
      );

      res.json({
        success: true,
        data: { message: 'Роль изменена' },
      });
    } catch (error) {
      if (error instanceof UserError) {
        const status = error.code === ErrorCodes.NOT_FOUND ? 404 : 403;
        res.status(status).json({
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
 * DELETE /api/users/:id
 * Удаление пользователя из компании
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

      await usersService.removeUser(
        req.params.id,
        req.user.companyId,
        req.user.userId
      );

      res.json({
        success: true,
        data: { message: 'Пользователь удалён' },
      });
    } catch (error) {
      if (error instanceof UserError) {
        const status = error.code === ErrorCodes.NOT_FOUND ? 404 : 403;
        res.status(status).json({
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
 * POST /api/users/invite
 * Создание пригласительной ссылки
 */
router.post(
  '/invite',
  requireRole('OWNER', 'ACCOUNTANT'),
  validateBody(z.object({
    role: z.enum(['PARTNER', 'FOREMAN', 'ACCOUNTANT', 'VIEWER']).default('FOREMAN'),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return;

      const { role } = req.body;

      // Только OWNER может приглашать PARTNER
      if (role === 'PARTNER' && req.user.role !== 'OWNER') {
        res.status(403).json({
          success: false,
          error: { code: ErrorCodes.FORBIDDEN, message: 'Только владелец может приглашать партнеров' }
        });
        return;
      }

      const invite = await usersService.createInvite(
        req.user.companyId,
        role as any,
        req.user.userId
      );

      // Construct full URL using request origin or env
      const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
      const fullLink = `${baseUrl}${invite.link}`;

      res.json({
        success: true,
        data: {
          ...invite,
          link: fullLink
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
