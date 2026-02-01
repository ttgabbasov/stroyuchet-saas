// ============================================
// СтройУчёт - Centralized Error Handler Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, handlePrismaError } from '../lib/errors';
import { ErrorCodes } from '../types/api.types';
import { logger } from '../lib/logger';

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error('Request error', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
    },
    user: (req as any).user?.userId,
  });

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError) {
    const appError = handlePrismaError(err);
    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    });
    return;
  }

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: err.name === 'TokenExpiredError'
          ? ErrorCodes.TOKEN_EXPIRED
          : ErrorCodes.UNAUTHORIZED,
        message: err.name === 'TokenExpiredError'
          ? 'Токен истёк'
          : 'Недействительный токен',
      },
    });
    return;
  }

  // Handle Zod validation errors (if using zod directly)
  if (err.name === 'ZodError') {
    const zodError = err as any;
    const details: Record<string, string[]> = {};

    if (zodError.errors) {
      zodError.errors.forEach((error: any) => {
        const path = error.path.join('.');
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(error.message);
      });
    }

    res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Ошибка валидации данных',
        details,
      },
    });
    return;
  }

  // Default error (500)
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: isDevelopment ? err.message : 'Внутренняя ошибка сервера',
    },
  });
}

// ============================================
// ASYNC ERROR WRAPPER
// ============================================

/**
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
