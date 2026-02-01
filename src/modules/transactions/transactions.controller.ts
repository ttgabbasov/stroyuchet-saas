// ============================================
// Transactions Controller v2
// ============================================

import { Request, Response, NextFunction } from 'express';
import * as transactionsService from './transactions.service';
import { TransactionError } from './transactions.service';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
  RunningBalanceQuery,
} from './transactions.schema';
import { ErrorCodes } from '../../types/api.types';

// ============================================
// LIST
// ============================================

/**
 * GET /api/transactions
 * Список транзакций с фильтрами (учитывает доступ к кассам)
 */
export async function list(
  req: Request<{}, {}, {}, ListTransactionsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const result = await transactionsService.getTransactions(
      req.user.userId,
      req.user.role,
      req.user.companyId,
      req.query
    );

    res.json({
      success: true,
      data: result.transactions,
      meta: {
        total: result.total,
        page: req.query.page,
        limit: req.query.limit,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

// ============================================
// GET ONE
// ============================================

/**
 * GET /api/transactions/:id
 * Получение транзакции по ID
 */
export async function getOne(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const transaction = await transactionsService.getTransactionById(
      req.params.id,
      req.user.userId,
      req.user.role,
      req.user.companyId
    );

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

// ============================================
// CREATE
// ============================================

/**
 * POST /api/transactions
 * Создание транзакции (проверяет доступ к кассе)
 */
export async function create(
  req: Request<{}, {}, CreateTransactionInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const transaction = await transactionsService.createTransaction(
      req.body,
      req.user.userId,
      req.user.companyId,
      req.user.role
    );

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

// ============================================
// UPDATE
// ============================================

/**
 * PATCH /api/transactions/:id
 * Обновление транзакции (только OWNER)
 */
export async function update(
  req: Request<{ id: string }, {}, UpdateTransactionInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const transaction = await transactionsService.updateTransaction(
      req.params.id,
      req.user.userId,
      req.user.role,
      req.user.companyId,
      req.body
    );

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

// ============================================
// DELETE
// ============================================

/**
 * DELETE /api/transactions/:id
 * Мягкое удаление транзакции (только OWNER)
 */
export async function remove(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    await transactionsService.softDeleteTransaction(
      req.params.id,
      req.user.userId,
      req.user.role,
      req.user.companyId
    );

    res.json({
      success: true,
      data: { message: 'Транзакция удалена' },
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

/**
 * POST /api/transactions/:id/restore
 * Восстановление удалённой транзакции (только OWNER)
 */
export async function restore(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const transaction = await transactionsService.restoreTransaction(
      req.params.id,
      req.user.role,
      req.user.companyId
    );

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

// ============================================
// RUNNING BALANCE
// ============================================

/**
 * GET /api/transactions/project/:projectId/running-balance
 * Транзакции с нарастающим итогом по проекту
 */
export async function runningBalance(
  req: Request<{ projectId: string }, {}, {}, RunningBalanceQuery>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const transactions = await transactionsService.getTransactionsWithRunningBalance(
      req.params.projectId,
      req.user.userId,
      req.user.role,
      req.user.companyId,
      { page: req.query.page, limit: req.query.limit }
    );

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * GET /api/transactions/analytics/by-category
 * Расходы по категориям (только EXPENSE)
 */
export async function byCategory(
  req: Request<{}, {}, {}, { projectId?: string; dateFrom?: string; dateTo?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const breakdown = await transactionsService.getExpensesByCategory(
      req.user.companyId,
      {
        projectId: req.query.projectId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      }
    );

    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transactions/analytics/payouts
 * Выплаты по сотрудникам (PAYOUT)
 */
export async function payoutsByUser(
  req: Request<{}, {}, {}, { projectId?: string; dateFrom?: string; dateTo?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const payouts = await transactionsService.getPayoutsByUser(
      req.user.companyId,
      {
        projectId: req.query.projectId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      }
    );

    res.json({
      success: true,
      data: payouts,
    });
  } catch (error) {
    next(error);
  }
}


/**
 * GET /api/transactions/analytics/summary
 * Сводная аналитика (Dashboard)
 */
export async function summary(
  req: Request<{}, {}, {}, { projectId?: string; dateFrom?: string; dateTo?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const summaryData = await transactionsService.getAnalyticsSummary(
      req.user.companyId,
      {
        projectId: req.query.projectId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      }
    );

    res.json({
      success: true,
      data: summaryData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transactions/analytics/reports/cash-flow
 * Отчет ДДС
 */
export async function getReport(
  req: Request<{}, {}, {}, { projectId?: string; dateFrom?: string; dateTo?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Не авторизован' },
      });
      return;
    }

    const reportData = await transactionsService.getCashFlowReport(
      req.user.companyId,
      {
        projectId: req.query.projectId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      }
    );

    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// ERROR HANDLER
// ============================================

function handleTransactionError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof TransactionError) {
    const statusMap: Record<string, number> = {
      [ErrorCodes.NOT_FOUND]: 404,
      [ErrorCodes.FORBIDDEN]: 403,
      [ErrorCodes.INVALID_INPUT]: 400,
    };

    const status = statusMap[error.code] || 400;

    res.status(status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  next(error);
}
