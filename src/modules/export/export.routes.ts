// ============================================
// Export Routes
// ============================================
// Доступно только для PRO и BUSINESS планов
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { PLAN_LIMITS } from '../../config/plan-limits';
import { ErrorCodes } from '../../types/api.types';
import * as exportService from './export.service';
import { ExportError } from './export.service';
import { TransactionType } from '@prisma/client';

const router = Router();

// ============================================
// MIDDLEWARE: Check Export Access (PRO+)
// ============================================

function requireExportAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
    });
    return;
  }

  const plan = req.user.plan;
  const limits = PLAN_LIMITS[plan];

  if (!limits.canExport) {
    res.status(403).json({
      success: false,
      error: {
        code: ErrorCodes.PLAN_LIMIT,
        message: 'Экспорт доступен только на тарифах PRO и BUSINESS',
      },
    });
    return;
  }

  next();
}

// Apply auth to all routes
router.use(authenticate);
router.use(requireExportAccess);

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/export/transactions/csv
 * Экспорт транзакций в CSV
 */
router.get('/transactions/csv', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, moneySourceId, type, categoryId, dateFrom, dateTo } = req.query;

    const csv = await exportService.exportTransactionsToCsv(req.user!.companyId, {
      projectId: projectId as string,
      moneySourceId: moneySourceId as string,
      type: type as TransactionType,
      categoryId: categoryId as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    const filename = `transactions_${formatFilenameDate()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    handleExportError(error, res, next);
  }
});

/**
 * GET /api/export/transactions/xlsx
 * Экспорт транзакций в Excel
 */
router.get('/transactions/xlsx', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, moneySourceId, type, categoryId, dateFrom, dateTo } = req.query;

    const xlsx = await exportService.exportTransactionsToXlsx(req.user!.companyId, {
      projectId: projectId as string,
      moneySourceId: moneySourceId as string,
      type: type as TransactionType,
      categoryId: categoryId as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    const filename = `transactions_${formatFilenameDate()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xlsx);
  } catch (error) {
    handleExportError(error, res, next);
  }
});

/**
 * GET /api/export/projects/:id/balance
 * Экспорт баланса проекта с нарастающим итогом
 */
router.get('/projects/:id/balance', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const csv = await exportService.exportProjectBalanceToCsv(id, req.user!.companyId);

    const filename = `project_balance_${formatFilenameDate()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    handleExportError(error, res, next);
  }
});

/**
 * GET /api/export/analytics/categories
 * Экспорт аналитики по категориям
 */
router.get('/analytics/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, dateFrom, dateTo } = req.query;

    const csv = await exportService.exportCategoryAnalyticsToCsv(req.user!.companyId, {
      projectId: projectId as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    const filename = `category_analytics_${formatFilenameDate()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    handleExportError(error, res, next);
  }
});

// ============================================
// HELPERS
// ============================================

function formatFilenameDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0].replace(/-/g, '');
}

function handleExportError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof ExportError) {
    res.status(400).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }
  next(error);
}

export default router;
