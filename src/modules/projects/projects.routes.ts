// ============================================
// Projects Routes
// ============================================

import { Router, RequestHandler } from 'express';
import * as projectsController from './projects.controller';
import { validateBody, validateQuery } from '../auth/auth.schema';
import {
  createProjectSchema,
  updateProjectSchema,
  assignAccessSchema,
  listProjectsQuerySchema,
} from './projects.schema';
import {
  authenticate,
  requireRole,
  requireProjectAccess,
  loadCompanyLimits,
} from '../../middleware/auth.middleware';

const router = Router();

// Все routes требуют авторизации
router.use(authenticate);
router.use(loadCompanyLimits);

// ============================================
// SUMMARY (before :id routes)
// ============================================

/**
 * GET /api/projects/summary
 * Сводка по объектам (dashboard)
 */
router.get(
  '/summary',
  projectsController.summary
);

// ============================================
// CRUD
// ============================================

/**
 * GET /api/projects
 * Список объектов (с учётом роли)
 */
router.get(
  '/',
  validateQuery(listProjectsQuerySchema),
  projectsController.list as unknown as RequestHandler
);

/**
 * POST /api/projects
 * Создание объекта (только OWNER)
 */
router.post(
  '/',
  requireRole('OWNER'),
  validateBody(createProjectSchema),
  projectsController.create
);

/**
 * GET /api/projects/:id
 * Получение объекта
 */
router.get(
  '/:id',
  requireProjectAccess('id'),
  projectsController.getOne
);

/**
 * GET /api/projects/:id/details
 * Детальная информация
 */
router.get(
  '/:id/details',
  requireProjectAccess('id'),
  projectsController.getDetails
);

/**
 * PATCH /api/projects/:id
 * Обновление объекта (только OWNER)
 */
router.patch(
  '/:id',
  requireRole('OWNER'),
  validateBody(updateProjectSchema),
  projectsController.update
);

/**
 * DELETE /api/projects/:id
 * Удаление объекта (только OWNER)
 */
router.delete(
  '/:id',
  requireRole('OWNER'),
  projectsController.remove
);

// ============================================
// ACCESS MANAGEMENT
// ============================================

/**
 * GET /api/projects/:id/access
 * Список пользователей с доступом (OWNER, ACCOUNTANT)
 */
router.get(
  '/:id/access',
  requireRole('OWNER', 'ACCOUNTANT'),
  projectsController.getAccess
);

/**
 * POST /api/projects/:id/access
 * Назначение доступа (только OWNER)
 */
router.post(
  '/:id/access',
  requireRole('OWNER'),
  validateBody(assignAccessSchema),
  projectsController.assignAccess
);

/**
 * DELETE /api/projects/:id/access/:userId
 * Отзыв доступа (только OWNER)
 */
router.delete(
  '/:id/access/:userId',
  requireRole('OWNER'),
  projectsController.revokeAccess
);

export default router;
