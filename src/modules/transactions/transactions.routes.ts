// ============================================
// Transactions Routes
// ============================================

import { Router, RequestHandler } from 'express';
import * as transactionsController from './transactions.controller';
import { validateBody, validateQuery } from '../auth/auth.schema';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  runningBalanceQuerySchema,
} from './transactions.schema';
import {
  authenticate,
  requireRole,
  requireProjectAccess,
} from '../../middleware/auth.middleware';

const router = Router();

// Все routes требуют авторизации
router.use(authenticate);

// ============================================
// ANALYTICS (before :id routes)
// ============================================

/**
 * GET /api/transactions/analytics/by-category
 * Расходы по категориям
 */
router.get(
  '/analytics/by-category',
  transactionsController.byCategory
);

/**
 * GET /api/transactions/analytics/payouts
 * Выплаты по сотрудникам
 */
router.get(
  '/analytics/payouts',
  transactionsController.payoutsByUser
);

/**
 * GET /api/transactions/analytics/summary
 * Сводная панель
 */
router.get(
  '/analytics/summary',
  transactionsController.summary
);

/**
 * GET /api/transactions/analytics/reports/cash-flow
 * Отчеты
 */
router.get(
  '/analytics/reports/cash-flow',
  transactionsController.getReport
);

// ============================================
// PROJECT-SPECIFIC ROUTES
// ============================================

/**
 * GET /api/transactions/project/:projectId/running-balance
 * Транзакции с нарастающим итогом
 */
router.get(
  '/project/:projectId/running-balance',
  requireProjectAccess('projectId'),
  validateQuery(runningBalanceQuerySchema),
  transactionsController.runningBalance as unknown as RequestHandler
);

// ============================================
// CRUD
// ============================================

/**
 * GET /api/transactions
 * Список транзакций с фильтрами
 */
router.get(
  '/',
  validateQuery(listTransactionsQuerySchema as any),
  transactionsController.list as unknown as RequestHandler
);

/**
 * POST /api/transactions
 * Создание транзакции (OWNER, FOREMAN)
 */
router.post(
  '/',
  requireRole('OWNER', 'FOREMAN'),
  validateBody(createTransactionSchema),
  transactionsController.create
);

/**
 * GET /api/transactions/:id
 * Получение транзакции
 */
router.get(
  '/:id',
  transactionsController.getOne
);

/**
 * PATCH /api/transactions/:id
 * Обновление транзакции (только OWNER)
 */
router.patch(
  '/:id',
  requireRole('OWNER'),
  validateBody(updateTransactionSchema),
  transactionsController.update
);

/**
 * DELETE /api/transactions/:id
 * Мягкое удаление (только OWNER)
 */
router.delete(
  '/:id',
  requireRole('OWNER'),
  transactionsController.remove
);

/**
 * POST /api/transactions/:id/restore
 * Восстановление удалённой (только OWNER)
 */
router.post(
  '/:id/restore',
  requireRole('OWNER'),
  transactionsController.restore
);

export default router;
