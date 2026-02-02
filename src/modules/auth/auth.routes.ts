// ============================================
// Auth Routes
// ============================================

import { Router } from 'express';
import * as authController from './auth.controller';
import {
  validateBody,
  registerSchema,
  loginSchema,
  joinCompanySchema,
  refreshTokenSchema,
  changePasswordSchema,
  createInviteSchema,
} from './auth.schema';
import {
  authenticate,
  requireRole,
  loadCompanyLimits,
  checkUserLimit,
} from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

// ============================================
// PUBLIC ROUTES (без авторизации)
// ============================================

/**
 * POST /api/auth/register
 * Регистрация новой компании + owner
 */
router.post(
  '/register',
  authLimiter.middleware(),
  validateBody(registerSchema),
  authController.register
);

/**
 * POST /api/auth/login
 * Вход по email + password
 */
router.post(
  '/login',
  authLimiter.middleware(),
  validateBody(loginSchema),
  authController.login
);

/**
 * POST /api/auth/join
 * Присоединение к компании по invite code
 */
router.post(
  '/join',
  authLimiter.middleware(),
  validateBody(joinCompanySchema),
  authController.joinCompany
);

/**
 * POST /api/auth/refresh
 * Обновление access token
 */
router.post(
  '/refresh',
  authLimiter.middleware(),
  validateBody(refreshTokenSchema),
  authController.refresh
);

/**
 * GET /api/auth/invites/validate/:code
 * Валидация кода приглашения
 */
router.get(
  '/invites/validate/:code',
  authLimiter.middleware(),
  authController.validateInvite
);

/**
 * GET /api/auth/me
 * Текущий пользователь
 */
router.get(
  '/me',
  authenticate,
  authController.me
);

/**
 * POST /api/auth/logout
 * Выход
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * POST /api/auth/password/change
 * Смена пароля
 */
router.post(
  '/password/change',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

// ============================================
// INVITES (только OWNER)
// ============================================

/**
 * POST /api/auth/invites
 * Создание приглашения
 */
router.post(
  '/invites',
  authenticate,
  requireRole('OWNER'),
  loadCompanyLimits,
  checkUserLimit, // Проверяем лимит перед созданием invite
  validateBody(createInviteSchema),
  authController.createInvite
);

/**
 * GET /api/auth/invites
 * Список активных приглашений
 */
router.get(
  '/invites',
  authenticate,
  requireRole('OWNER'),
  authController.getInvites
);

/**
 * DELETE /api/auth/invites/:id
 * Отзыв приглашения
 */
router.delete(
  '/invites/:id',
  authenticate,
  requireRole('OWNER'),
  authController.revokeInvite
);

export default router;
