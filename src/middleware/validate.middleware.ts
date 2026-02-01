// ============================================
// СтройУчёт - Validation Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors';

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Middleware для валидации request body
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};

        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(issue.message);
        }

        next(new ValidationError('Ошибка валидации данных', details));
        return;
      }

      next(error);
    }
  };
}

/**
 * Middleware для валидации query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};

        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(issue.message);
        }

        next(new ValidationError('Ошибка параметров запроса', details));
        return;
      }

      next(error);
    }
  };
}

/**
 * Middleware для валидации route parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};

        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(issue.message);
        }

        next(new ValidationError('Ошибка параметров маршрута', details));
        return;
      }

      next(error);
    }
  };
}
