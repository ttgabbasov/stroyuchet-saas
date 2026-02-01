// ============================================
// СтройУчёт - Unified Error Handling
// ============================================

import { ErrorCodes } from '../types/api.types';
import { Prisma } from '@prisma/client';

// ============================================
// BASE ERROR CLASS
// ============================================

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================
// SPECIFIC ERROR CLASSES
// ============================================

export class NotFoundError extends AppError {
  constructor(message: string = 'Ресурс не найден') {
    super(ErrorCodes.NOT_FOUND, message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Требуется авторизация') {
    super(ErrorCodes.UNAUTHORIZED, message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Недостаточно прав') {
    super(ErrorCodes.FORBIDDEN, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.INVALID_INPUT, message, 400);
    this.name = 'InvalidInputError';
  }
}

export class AlreadyExistsError extends AppError {
  constructor(message: string = 'Ресурс уже существует') {
    super(ErrorCodes.ALREADY_EXISTS, message, 409);
    this.name = 'AlreadyExistsError';
  }
}

export class PlanLimitExceededError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.PLAN_LIMIT_EXCEEDED, message, 403);
    this.name = 'PlanLimitExceededError';
  }
}

export class FeatureNotAvailableError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.FEATURE_NOT_AVAILABLE, message, 403);
    this.name = 'FeatureNotAvailableError';
  }
}

// ============================================
// PRISMA ERROR HANDLER
// ============================================

export function handlePrismaError(error: unknown): AppError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const target = (error.meta?.target as string[]) || [];
        const field = target[0] || 'поле';
        return new AlreadyExistsError(`Запись с таким ${field} уже существует`);
      
      case 'P2025':
        // Record not found
        return new NotFoundError('Запись не найдена');
      
      case 'P2003':
        // Foreign key constraint violation
        return new InvalidInputError('Нарушение целостности данных');
      
      case 'P2014':
        // Required relation violation
        return new InvalidInputError('Нарушение связи между записями');
      
      default:
        return new InvalidInputError('Ошибка базы данных');
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('Ошибка валидации данных');
  }

  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }

  // Unknown error
  return new AppError(
    ErrorCodes.INTERNAL_ERROR,
    error instanceof Error ? error.message : 'Неизвестная ошибка',
    500
  );
}
